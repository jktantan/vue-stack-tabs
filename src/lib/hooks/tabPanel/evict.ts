/**
 * tabPanel/evict - 缓存驱逐逻辑
 *
 * 职责：基于当前 StackTabsRuntimeContext 标记待驱逐缓存、执行驱逐、维护 caches / components。
 */
import type { ITabPage } from '../../model/TabModel'
import { triggerRef } from 'vue'
import type { StackTabsRuntimeContext } from '../stackTabsContext'

export interface TabPanelEvictionApi {
  markCacheForEviction: (cacheName: string) => void
  markTabPagesForEviction: (tab: { id: string; pages: { list(): ITabPage[] } }) => void
  markTabPagesForEvictionOnly: (tab: { pages: { list(): ITabPage[] } }) => void
  addCache: (cacheName: string) => void
  removeCache: (cacheName: string) => void
  evictPageCache: (cacheName: string) => void
  replacePageCaches: (
    cacheNamesToEvict: Iterable<string>,
    cacheNamesToAdd: Iterable<string>
  ) => void
  evictMarkedCaches: () => void
}

export const createTabPanelEviction = (context: StackTabsRuntimeContext): TabPanelEvictionApi => {
  const { caches, components, cacheIdsToEvict, tabIdsToEvict } = context

  const cacheSet = new Set<string>(caches.value)
  let cacheList = caches.value

  /** 外部重置 caches（例如 destroy）后，同步内部 Set，避免后续 addCache 被错误跳过。 */
  const syncCacheSet = () => {
    if (cacheList === caches.value) return
    cacheList = caches.value
    cacheSet.clear()
    for (const cacheName of cacheList) cacheSet.add(cacheName)
  }

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
    syncCacheSet()
    if (!cacheSet.has(cacheName)) {
      cacheSet.add(cacheName)
      cacheList.push(cacheName)
      triggerRef(caches)
    }
  }

  const removeCache = (cacheName: string): void => {
    syncCacheSet()
    if (cacheSet.has(cacheName)) {
      cacheSet.delete(cacheName)
      const index = cacheList.indexOf(cacheName)
      if (index >= 0) cacheList.splice(index, 1)
      triggerRef(caches)
    }
  }

  const evictPageCache = (cacheName: string): void => {
    if (!cacheName) return
    cacheIdsToEvict.delete(cacheName)
    removeCache(cacheName)
    components.delete(cacheName)
  }

  /** 批量替换缓存 id，仅在所有变更完成后通知一次，供刷新全部等操作使用。 */
  const replacePageCaches = (
    cacheNamesToEvict: Iterable<string>,
    cacheNamesToAdd: Iterable<string>
  ): void => {
    syncCacheSet()
    const toEvict = new Set(cacheNamesToEvict)
    let changed = false

    if (toEvict.size > 0) {
      for (let index = cacheList.length - 1; index >= 0; index--) {
        const cacheName = cacheList[index]
        if (cacheName && toEvict.has(cacheName)) {
          cacheList.splice(index, 1)
          changed = true
        }
      }
      for (const cacheName of toEvict) {
        cacheSet.delete(cacheName)
        cacheIdsToEvict.delete(cacheName)
        components.delete(cacheName)
      }
    }

    for (const cacheName of cacheNamesToAdd) {
      if (!cacheSet.has(cacheName)) {
        cacheSet.add(cacheName)
        cacheList.push(cacheName)
        changed = true
      }
    }

    if (changed) triggerRef(caches)
  }

  const evictMarkedCaches = (): void => {
    if (cacheIdsToEvict.size <= 0) return

    syncCacheSet()
    const toEvict = new Set(cacheIdsToEvict)
    for (let index = cacheList.length - 1; index >= 0; index--) {
      const cacheName = cacheList[index]
      if (cacheName && toEvict.has(cacheName)) cacheList.splice(index, 1)
    }
    for (const cacheName of toEvict) {
      cacheSet.delete(cacheName)
      components.delete(cacheName)
    }
    triggerRef(caches)
    cacheIdsToEvict.clear()
  }

  return {
    markCacheForEviction,
    markTabPagesForEviction,
    markTabPagesForEvictionOnly,
    addCache,
    removeCache,
    evictPageCache,
    replacePageCaches,
    evictMarkedCaches
  }
}
