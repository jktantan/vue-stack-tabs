import { useRouter } from 'vue-router'
import { throttle } from 'throttle-debounce'
import { defu } from 'defu'
import { ulid } from 'ulid'

import useTabPanel from './useTabPanel'
import { encodeTabInfo } from '../utils/tabInfoEncoder'
import { parseUrl, isCrossOriginUrl } from '../utils/urlParser'
import type { ITabData, IframeRefreshMode } from '../model/TabModel'
import { TabEventType, useTabEmitter } from './useTabEventBus'

/** iframe 占位路由的 path，由 StackTabs 通过 setIFramePath 注入 */
let iframePath: string

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
  const emitter = useTabEmitter()
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
    if (!info.id) info.id = ulid()
    return info
  }

  /** 打开新标签；renew=true 时若已存在则清空该标签的页面栈后重新打开；500ms 节流 */
  const openTab = throttle(500, (tab: ITabData, renew = false) => {
    return new Promise<string | undefined>((resolve, reject) => {
      const tabInfo = prepareTabInfo(tab)

      if (hasTab(tabInfo.id!) && !renew) {
        emitter.emit(TabEventType.TAB_ACTIVE, { id: tabInfo.id! })
        resolve(tabInfo.id)
        return
      }

      if (tabInfo.id && renew && hasTab(tabInfo.id)) {
        renewTab(tab)
        const currentTab = getTab(tab.id!)
        if (currentTab?.active) refreshKey.value++
      }

      if (!canAddTab()) {
        reject(new Error('Max Size'))
        return
      }

      navigateToTab(tab, tabInfo)
      resolve(tabInfo.id)
    })
  })

  /** 执行路由跳转到标签对应页面（普通路由或 iframe 占位路由） */
  const navigateToTab = (tab: ITabData, tabInfo: ITabData) => {
    const __tab = encodeTabInfo(tabInfo)
    let query = defu({ __tab }, tab.query) as Record<string, string>
    let path: string
    if (!tab.iframe) {
      const url = parseUrl(tab.path)
      path = url.path
      query = defu(url.query, query)
    } else {
      query['__src'] = encodeURIComponent(tab.path as string)
      path = iframePath
    }
    router.push({ path, query })
  }

  /** 设置 iframe 占位路由的 path，由 StackTabs 在挂载时调用 */
  const setIFramePath = (path: string) => {
    iframePath = path
  }

  /** 获取当前页面的缓存容器 DOM（用于某些需要直接操作 DOM 的场景） */
  const getWrapper = () => {
    return document.getElementsByClassName('cache-page-wrapper')[0]
  }

  /** iframe 标签在新窗口打开（无法嵌入时降级） */
  const openInNewWindow = (id: string) => {
    const tab = getTab(id)
    if (tab?.iframe && tab.url) {
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
