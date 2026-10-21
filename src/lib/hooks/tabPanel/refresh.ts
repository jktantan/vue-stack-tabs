/**
 * tabPanel/refresh - 普通页面与 iframe 标签的刷新逻辑。
 *
 * 活动普通页面保持 cache id 稳定，只递增页面级刷新版本；非活动页面可直接替换缓存。
 */
import type { Ref } from 'vue'
import type { ITabItem, ITabPage } from '../../model/TabModel'
import type { PagePatch, PageUpdate } from './tabStore'

export interface TabPanelRefreshApi {
  refreshTab: (id: string) => void
  refreshAllTabs: () => void
}

export interface CreateTabPanelRefreshOptions {
  getTabs: () => readonly ITabItem[]
  getTopPage: (tabId: string) => ITabPage | null
  /** 修改页面字段（刷新版本 / 页面 id） */
  updatePage: (tabId: string, pageId: string, patch: PagePatch) => boolean
  /** 批量修改页面字段，refreshAllTabs 最后统一触发一次 tabs 更新 */
  updatePages: (updates: readonly PageUpdate[]) => void
  iframeRefreshKeys: Ref<Record<string, number>>
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
    getTabs,
    getTopPage,
    updatePage,
    updatePages,
    iframeRefreshKeys,
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

  const refreshPage = (
    tab: ITabItem,
    cacheNamesToEvict?: string[],
    cacheNamesToAdd?: string[],
    pageUpdates?: PageUpdate[]
  ) => {
    const currentPage = getTopPage(tab.id)
    if (!currentPage) return

    if (tab.active) {
      const patch = { refreshVersion: (currentPage.refreshVersion ?? 0) + 1 }
      if (pageUpdates) {
        pageUpdates.push({ tabId: tab.id, pageId: currentPage.id, patch })
      } else {
        // 只有 refreshVersion 变化：页面对象是响应式的，不需要重建 tabs 数组。
        updatePage(tab.id, currentPage.id, patch)
      }
      return
    }

    const oldCacheName = currentPage.id
    const nextPageId = createPageId()
    const patch = { id: nextPageId, refreshVersion: 0 }
    if (pageUpdates) {
      pageUpdates.push({ tabId: tab.id, pageId: oldCacheName, patch })
    } else {
      updatePage(tab.id, oldCacheName, patch)
    }
    if (cacheNamesToEvict && cacheNamesToAdd) {
      cacheNamesToEvict.push(oldCacheName)
      cacheNamesToAdd.push(nextPageId)
      return
    }
    evictPageCache(oldCacheName)
    addCache(nextPageId)
  }

  const refreshTab = (id: string) => {
    const tab = getTabs().find((item) => item.id === id)
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
    const pageUpdates: PageUpdate[] = []
    const iframeKeysUpdate = { ...iframeRefreshKeys.value }
    let iframeKeysChanged = false

    for (const tab of getTabs()) {
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
      refreshPage(tab, cacheNamesToEvict, cacheNamesToAdd, pageUpdates)
    }

    if (iframeKeysChanged) iframeRefreshKeys.value = iframeKeysUpdate
    updatePages(pageUpdates)
    replacePageCaches(cacheNamesToEvict, cacheNamesToAdd)
  }

  return { refreshTab, refreshAllTabs }
}
