import { isNavigationFailure, useRouter } from 'vue-router'
import type { LocationQueryRaw } from 'vue-router'
import { defu } from 'defu'
import useTabPanel from './useTabPanel'
import { encodeTabInfo } from '../utils/tabInfoEncoder'
import {
  parseUrl,
  isCrossOriginUrl,
  isAllowedTabUrl,
  omitStackTabsReservedQuery
} from '../utils/urlParser'
import type { ITabData, IframeRefreshMode } from '../model/TabModel'
import { runNavigationTransaction } from './tabPanel/navigationTransaction'
import { resolveStackTabsRuntimeContext } from './stackTabsContext'

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
export default function useTabActions() {
  const router = useRouter()
  const runtimeContext = resolveStackTabsRuntimeContext()
  const {
    active,
    hasTab,
    refreshKey,
    reset,
    canAddTab,
    renewTab,
    getTab,
    tabs,
    removeTab,
    removeAllTabs,
    refreshTab,
    refreshAllTabs
  } = useTabPanel()

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
    if (!info.id) info.id = crypto.randomUUID()
    return info
  }

  /** 打开新标签；renew=true 时若已存在则清空该标签的页面栈后重新打开 */
  const openTab = (tab: ITabData, renew = false): Promise<string | undefined> => {
    return new Promise<string | undefined>((resolve, reject) => {
      const tabInfo = prepareTabInfo(tab)

      const isExistingTab = Boolean(tabInfo.id && hasTab(tabInfo.id))

      if (isExistingTab && !renew) {
        Promise.resolve(active(tabInfo.id!)).then(() => resolve(tabInfo.id), reject)
        return
      }

      let rollbackRenew: (() => void) | undefined
      let refreshKeySnapshot: number | undefined

      if (tabInfo.id && renew && isExistingTab) {
        const currentTab = getTab(tab.id!)
        rollbackRenew = renewTab(tab)
        if (currentTab?.active) {
          refreshKeySnapshot = refreshKey.value
          refreshKey.value++
        }
      }

      if (!isExistingTab && !canAddTab()) {
        reject(new Error('Max Size'))
        return
      }

      navigateToTab(tab, tabInfo).then(
        () => resolve(tabInfo.id),
        (error) => {
          rollbackRenew?.()
          if (refreshKeySnapshot !== undefined) refreshKey.value = refreshKeySnapshot
          reject(error)
        }
      )
    })
  }

  /** 执行路由跳转到标签对应页面（普通路由或 iframe 占位路由） */
  const navigateToTab = (tab: ITabData, tabInfo: ITabData) => {
    const __tab = encodeTabInfo(tabInfo)
    const tabQuery = omitStackTabsReservedQuery(tab.query)
    let query = defu(tabQuery, { __tab }) as LocationQueryRaw
    let path: string

    if (!tab.iframe) {
      const url = parseUrl(tab.path)
      path = url.path
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
      navigate: () => router.push({ path, query }),
      rollback: () => undefined,
      isFailureResult: isNavigationFailure,
      rejectFailureResult: true
    })
  }

  /** 设置 iframe 占位路由的 path，由 StackTabs 在挂载时调用 */
  const setIFramePath = (path: string) => {
    runtimeContext.iframePath.value = path
  }

  /** 获取当前页面的缓存容器 DOM（用于某些需要直接操作 DOM 的场景） */
  const getWrapper = () => {
    return document.getElementsByClassName('cache-page-wrapper')[0]
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
    reset,

    // 数据与配置
    tabs,
    setIFramePath,
    getWrapper,
    openInNewWindow
  }
}
