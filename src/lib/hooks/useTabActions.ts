import { isNavigationFailure, NavigationFailureType, useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { defu } from 'defu'
import useTabPanel from './useTabPanel'
import { createId, encodeTabInfo } from '../utils/tabInfoEncoder'
import {
  parseUrl,
  isCrossOriginUrl,
  isAllowedTabUrl,
  omitStackTabsReservedQuery
} from '../utils/urlParser'
import { Stack } from '../model/TabModel'
import type { ITabData, ITabItem, ITabPage, IframeRefreshMode } from '../model/TabModel'
import { runNavigationTransaction } from './tabPanel/navigationTransaction'
import { resolveStackTabsRuntimeContext, type StackTabsRuntimeContext } from './stackTabsContext'

/**
 * useTabActions - 标签操作对外 Hook
 *
 * 职责：提供打开、关闭、刷新标签等用户级 API，内部委托 useTabPanel 执行
 * 使用范围：业务代码、ContextMenu、TabHeader 等
 *
 * 主要 API：
 * - openTab(tab, renew?) 打开或续签标签
 * - closeTab(id) / closeAllTabs() 关闭标签
 * - refreshTab(id) / refreshAllTabs() 刷新
 * - activeTab(id, isRoute?) 激活标签
 * - reset() 重置（关闭所有）
 */
export default function useTabActions(providedRuntimeContext?: StackTabsRuntimeContext) {
  const router = useRouter()
  const runtimeContext = providedRuntimeContext ?? resolveStackTabsRuntimeContext()
  const {
    active,
    updateTabTitle,
    hasTab,
    refreshKey,
    reset,
    canAddTab,
    renewTab,
    getTab,
    getActiveTab,
    getTopPage,
    tabs,
    moveTab,
    addTab,
    removeTab,
    removeTabForce,
    removeAllTabs,
    refreshTab,
    refreshAllTabs,
    setTabPending
  } = useTabPanel(runtimeContext)

  /** 合并默认值，生成完整 tabInfo */
  const prepareTabInfo = (tab: ITabData): ITabData => {
    const defaults: Partial<ITabData> = {
      refreshable: true,
      closable: true,
      iframe: false
    }
    if (tab.iframe && tab.iframeRefreshMode === undefined) {
      defaults.iframeRefreshMode = isCrossOriginUrl(tab.path ?? '')
        ? ('reload' as IframeRefreshMode)
        : ('postMessage' as IframeRefreshMode)
    } else if (tab.iframe) {
      defaults.iframeRefreshMode = (tab.iframeRefreshMode ?? 'postMessage') as IframeRefreshMode
    }
    const info = defu(tab, defaults)
    if (!info.id) info.id = createId()
    return info
  }

  /**
   * 创建占位标签：页签先落到标签栏，页面栈留空。
   *
   * 目标页面由随后的路由导航补齐；补齐前 `pending` 为 true，
   * StackTabs 会据此在内容区渲染 loading。
   */
  const createPendingTab = (tabInfo: ITabData): ITabItem => ({
    id: tabInfo.id!,
    title: tabInfo.title,
    closable: tabInfo.closable ?? true,
    refreshable: tabInfo.refreshable ?? true,
    iframe: Boolean(tabInfo.iframe),
    iframeRefreshMode: tabInfo.iframeRefreshMode,
    url: tabInfo.iframe ? tabInfo.path : undefined,
    active: true,
    pages: new Stack<ITabPage>(),
    pending: true
  })

  /** 打开新标签；renew=true 时若已存在则清空该标签的页面栈后重新打开 */
  const openTab = (tab: ITabData, renew = false): Promise<string | undefined> => {
    return new Promise<string | undefined>((resolve, reject) => {
      const tabInfo = prepareTabInfo(tab)
      const tabId = tabInfo.id!

      const isExistingTab = Boolean(tabInfo.id && hasTab(tabInfo.id))

      if (isExistingTab && !renew) {
        Promise.resolve(active(tabId)).then(() => resolve(tabInfo.id), reject)
        return
      }

      if (!isExistingTab && !canAddTab()) {
        reject(new Error('Max Size'))
        return
      }

      // 占位标签出现前的激活项，导航失败时用它恢复
      const previousActiveId = getActiveTab()?.id ?? ''

      let rollbackRenew: (() => void) | undefined
      let refreshKeySnapshot: number | undefined

      if (renew && isExistingTab) {
        const currentTab = getTab(tabId)
        rollbackRenew = renewTab(tab)
        if (currentTab?.active) {
          refreshKeySnapshot = refreshKey.value
          refreshKey.value++
        }
      } else {
        // 先把页签落到标签栏：慢网下用户点完菜单就能看到反馈，
        // 页面 chunk 下载完之前内容区由 StackTabs 显示 loading。
        addTab(createPendingTab(tabInfo))
      }
      setTabPending(tabId, true)

      /** 导航结束后的收尾：普通标签等页面挂载后撤 loading，失败移除占位 */
      const finishPending = (succeeded: boolean) => {
        if (!hasTab(tabId)) return

        // renew（刷新）没有稳定的页面挂载事件，直接撤
        if (isExistingTab) {
          setTabPending(tabId, false)
          return
        }

        if (succeeded) {
          // 普通标签等目标页面挂载后由 StackTabs 的 onComponentLoaded 撤 loading；
          // iframe 没有页面挂载事件，这里直接撤。
          if (tabInfo.iframe) setTabPending(tabId, false)
          return
        }

        // 新标签导航失败：移除占位，并把激活项还给之前的标签。
        // 期间用户若已切到别的标签，则只清理占位，不抢回激活态。
        const shouldRestoreActive = getActiveTab()?.id === tabId
        removeTabForce(tabId)
        if (shouldRestoreActive && previousActiveId) {
          void active(previousActiveId, false)
        }
      }

      navigateToTab(tab, tabInfo, isExistingTab && renew).then(
        () => {
          finishPending(true)
          resolve(tabInfo.id)
        },
        (error) => {
          finishPending(false)
          rollbackRenew?.()
          if (refreshKeySnapshot !== undefined) refreshKey.value = refreshKeySnapshot
          reject(error)
        }
      )
    })
  }

  /** 执行路由跳转到标签对应页面（普通路由或 iframe 占位路由） */
  const navigateToTab = (tab: ITabData, tabInfo: ITabData, allowDuplicatedNavigation = false) => {
    const __tab = encodeTabInfo(tabInfo)
    const tabQuery = omitStackTabsReservedQuery(tab.query)
    let query = defu(tabQuery, { __tab }) as LocationQueryRaw
    let path: string
    let hash: string | undefined

    if (!tab.iframe) {
      const url = parseUrl(tab.path)
      path = url.path
      hash = url.hash || undefined
      query = defu(omitStackTabsReservedQuery(url.query), query, { __tab }) as LocationQueryRaw
      query = {
        ...query,
        __tab
      }
    } else {
      query = {
        ...query,
        __src: encodeURIComponent(tab.path as string),
        __tab
      }
      path = runtimeContext.iframePath.value
    }

    if (!isAllowedTabUrl(tab.path)) return Promise.reject(new Error('Invalid tab URL'))
    return runNavigationTransaction({
      apply: () => undefined,
      navigate: () => router.push({ path, query, hash }),
      rollback: () => undefined,
      // renew 当前标签时地址可能不变：vue-router 会返回 duplicated NavigationFailure，
      // 这属于预期结果（refreshKey 会触发页面重新解析），不应让 openTab reject。
      isFailureResult: (result) =>
        isNavigationFailure(result) &&
        !(
          allowDuplicatedNavigation && isNavigationFailure(result, NavigationFailureType.duplicated)
        ),
      rejectFailureResult: true
    })
  }

  /** 设置 iframe 占位路由的 path，由 StackTabs 在挂载时调用 */
  const setIFramePath = (path: string) => {
    runtimeContext.iframePath.value = path
  }

  /**
   * 获取缓存页面容器。
   * 不传参数时保留旧行为并返回第一个容器；多标签场景应传 tabId 或 pageId，
   * 避免因 DOM 排序而取得错误页面。
   */
  const getWrapper = (
    target: { tabId?: string; pageId?: string } = {}
  ): HTMLElement | undefined => {
    if (typeof document === 'undefined') return undefined
    const pageId = target.pageId ?? (target.tabId ? getTopPage(target.tabId)?.id : undefined)
    if (pageId) return document.getElementById(`W-${pageId}`) ?? undefined
    return document.querySelector<HTMLElement>('.stack-tab__cache-page-wrapper') ?? undefined
  }

  /** iframe 标签在新窗口打开（无法嵌入时降级） */
  const openInNewWindow = (id: string) => {
    const tab = getTab(id)
    if (tab?.iframe && tab.url && isAllowedTabUrl(tab.url)) {
      window.open(tab.url, '_blank', 'noopener,noreferrer')
    }
  }

  return {
    // 打开
    openTab,

    // 关闭
    closeTab: removeTab,
    closeAllTabs: removeAllTabs,

    // 刷新
    refreshTab,
    refreshAllTabs,

    // 激活与重置
    activeTab: active,
    moveTab,
    updateTabTitle,
    reset,

    // 数据与配置
    tabs,
    setIFramePath,
    getWrapper,
    openInNewWindow
  }
}
