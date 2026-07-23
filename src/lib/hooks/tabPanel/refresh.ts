/**
 * tabPanel/refresh - 普通页面与 iframe 标签的刷新逻辑。
 *
 * 活动普通页面保持 cache id 稳定，只递增页面级刷新版本；非活动页面可直接替换缓存。
 */
import type { Ref } from 'vue'
import type { ITabItem } from '../../model/TabModel'

export interface TabPanelRefreshApi {
  refreshTab: (id: string) => void
  refreshAllTabs: () => void
}

export interface CreateTabPanelRefreshOptions {
  tabs: Ref<ITabItem[]>
  iframeRefreshKeys: Ref<Record<string, number>>
  getTab: (id: string) => ITabItem | null
  createPageId: () => string
  addCache: (cacheName: string) => void
  evictPageCache: (cacheName: string) => void
  replacePageCaches: (
    cacheNamesToEvict: Iterable<string>,
    cacheNamesToAdd: Iterable<string>
  ) => void
  refreshIframeByPostMessage: (tabId: string) => void
}

export const createTabPanelRefresh = (
  options: CreateTabPanelRefreshOptions
): TabPanelRefreshApi => {
  const {
    tabs,
    iframeRefreshKeys,
    getTab,
    createPageId,
    addCache,
    evictPageCache,
    replacePageCaches,
    refreshIframeByPostMessage
  } = options

  const refreshIframe = (tab: ITabItem) => {
    if (tab.iframeRefreshMode === 'reload') {
      iframeRefreshKeys.value = {
        ...iframeRefreshKeys.value,
        [tab.id]: (iframeRefreshKeys.value[tab.id] ?? 0) + 1
      }
      return
    }
    refreshIframeByPostMessage(tab.id)
  }

  const refreshPage = (tab: ITabItem, cacheNamesToEvict?: string[], cacheNamesToAdd?: string[]) => {
    const currentPage = tab.pages.peek()
    if (!currentPage) return

    if (tab.active) {
      currentPage.refreshVersion = (currentPage.refreshVersion ?? 0) + 1
      return
    }

    const oldCacheName = currentPage.id
    currentPage.id = createPageId()
    currentPage.refreshVersion = 0
    if (cacheNamesToEvict && cacheNamesToAdd) {
      cacheNamesToEvict.push(oldCacheName)
      cacheNamesToAdd.push(currentPage.id)
      return
    }
    evictPageCache(oldCacheName)
    addCache(currentPage.id)
  }

  const refreshTab = (id: string) => {
    const tab = getTab(id)
    if (!tab?.refreshable) return
    if (tab.iframe) {
      refreshIframe(tab)
      return
    }
    refreshPage(tab)
  }

  const refreshAllTabs = () => {
    const cacheNamesToEvict: string[] = []
    const cacheNamesToAdd: string[] = []
    const iframeKeysUpdate = { ...iframeRefreshKeys.value }
    let iframeKeysChanged = false

    for (const tab of tabs.value) {
      if (!tab.refreshable) continue
      if (tab.iframe) {
        if (tab.iframeRefreshMode === 'reload') {
          iframeKeysUpdate[tab.id] = (iframeKeysUpdate[tab.id] ?? 0) + 1
          iframeKeysChanged = true
        } else {
          refreshIframeByPostMessage(tab.id)
        }
        continue
      }
      refreshPage(tab, cacheNamesToEvict, cacheNamesToAdd)
    }

    if (iframeKeysChanged) iframeRefreshKeys.value = iframeKeysUpdate
    replacePageCaches(cacheNamesToEvict, cacheNamesToAdd)
  }

  return { refreshTab, refreshAllTabs }
}
