/**
 * tabPanel/evict - 缓存驱逐逻辑
 *
 * 职责：基于当前 StackTabsRuntimeContext 标记待驱逐缓存、执行驱逐、维护 caches / components。
 */
import type { ITabPage } from '../../model/TabModel'
import type { StackTabsRuntimeContext } from '../stackTabsContext'

export interface TabPanelEvictionApi {
  markCacheForEviction: (cacheName: string) => void
  markTabPagesForEviction: (tab: { id: string; pages: { list(): ITabPage[] } }) => void
  markTabPagesForEvictionOnly: (tab: { pages: { list(): ITabPage[] } }) => void
  addCache: (cacheName: string) => void
  removeCache: (cacheName: string) => void
  evictPageCache: (cacheName: string) => void
  evictMarkedCaches: () => void
}

export const createTabPanelEviction = (context: StackTabsRuntimeContext): TabPanelEvictionApi => {
  const { caches, components, cacheIdsToEvict, tabIdsToEvict } = context

  const cacheSet = new Set<string>(caches.value)

  const markCacheForEviction = (cacheName: string): void => {
    cacheIdsToEvict.add(cacheName)
  }

  const markTabPagesForEviction = (tab: { id: string; pages: { list(): ITabPage[] } }): void => {
    for (const page of tab.pages.list()) markCacheForEviction(page.id)
    tabIdsToEvict.add(tab.id)
  }

  const markTabPagesForEvictionOnly = (tab: { pages: { list(): ITabPage[] } }): void => {
    for (const page of tab.pages.list()) markCacheForEviction(page.id)
  }

  const addCache = (cacheName: string): void => {
    if (!cacheSet.has(cacheName)) {
      cacheSet.add(cacheName)
      caches.value = [...caches.value, cacheName]
    }
  }

  const removeCache = (cacheName: string): void => {
    if (cacheSet.has(cacheName)) {
      cacheSet.delete(cacheName)
      caches.value = caches.value.filter((c) => c !== cacheName)
    }
  }

  const evictPageCache = (cacheName: string): void => {
    if (!cacheName) return
    cacheIdsToEvict.delete(cacheName)
    removeCache(cacheName)
    components.delete(cacheName)
  }

  const evictMarkedCaches = (): void => {
    if (cacheIdsToEvict.size <= 0) return

    const toEvict = new Set(cacheIdsToEvict)
    caches.value = caches.value.filter((c) => !toEvict.has(c))
    for (const cacheName of toEvict) {
      cacheSet.delete(cacheName)
      components.delete(cacheName)
    }
    cacheIdsToEvict.clear()
  }

  return {
    markCacheForEviction,
    markTabPagesForEviction,
    markTabPagesForEvictionOnly,
    addCache,
    removeCache,
    evictPageCache,
    evictMarkedCaches
  }
}
