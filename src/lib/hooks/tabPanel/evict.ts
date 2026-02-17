/**
 * tabPanel/evict - 缓存驱逐逻辑
 *
 * 职责：标记待驱逐缓存、执行驱逐、维护 caches/components
 */
import type { ITabPage } from '../../model/TabModel'
import {
  caches,
  components,
  cacheIdsToEvict,
  tabIdsToEvict
} from './state'

/** 标记缓存为待驱逐 */
export const markCacheForEviction = (cacheName: string) => {
  cacheIdsToEvict.add(cacheName)
}

/** 标记标签下所有页面为可驱逐，并标记该标签（关闭场景） */
export const markTabPagesForEviction = (tab: { id: string; pages: { list(): ITabPage[] } }) => {
  for (const page of tab.pages.list()) markCacheForEviction(page.id)
  tabIdsToEvict.add(tab.id)
}

/** 仅标记标签下所有页面为可驱逐（续签场景） */
export const markTabPagesForEvictionOnly = (tab: { pages: { list(): ITabPage[] } }) => {
  for (const page of tab.pages.list()) markCacheForEviction(page.id)
}

/** 将缓存 id 加入 caches */
export const addCache = (cacheName: string) => {
  if (!caches.value.includes(cacheName)) caches.value.push(cacheName)
}

/** 从 caches 中移除指定 id */
export const removeCache = (cacheName: string) => {
  const i = caches.value.indexOf(cacheName)
  if (i >= 0) caches.value.splice(i, 1)
}

/** 立即驱逐单个页面缓存 */
export const evictPageCache = (cacheName: string) => {
  if (!cacheName) return
  cacheIdsToEvict.delete(cacheName)
  removeCache(cacheName)
  components.delete(cacheName)
}

/** 执行所有待驱逐缓存的驱逐 */
export const evictMarkedCaches = () => {
  if (cacheIdsToEvict.size > 0) {
    for (const cacheName of [...cacheIdsToEvict]) {
      evictPageCache(cacheName)
    }
    cacheIdsToEvict.clear()
  }
}
