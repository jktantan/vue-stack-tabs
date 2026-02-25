/**
 * tabPanel/evict - 缓存驱逐逻辑
 *
 * 职责：标记待驱逐缓存、执行驱逐、维护 caches / components
 *
 * 驱逐机制分两种：
 *
 * 1. 「标记 + 延迟驱逐」—— 用于关闭标签、刷新标签等场景
 *    调用 markCacheForEviction 将 cacheName 放入 cacheIdsToEvict 集合，
 *    等到目标页面的 cacheComponent 触发 onActivated 时，
 *    再批量调用 evictMarkedCaches 真正执行驱逐。
 *    该策略确保只有切换到新的活动页后才清理旧缓存，避免渲染空白。
 *
 * 2. 「立即驱逐」—— 用于 backward 内部退栈场景
 *    调用 evictPageCache 直接同步清除单个缓存，
 *    但必须在 router.push().then() 回调内调用（即导航完成后），
 *    否则会触发以旧路由为基础的响应式重渲染，导致刚驱逐的组件被重建。
 *    详见 useTabRouter.ts backward 函数的时序说明。
 */
import type { ITabPage } from '../../model/TabModel'
import { caches, components, cacheIdsToEvict, tabIdsToEvict } from './state'

/**
 * 将指定 cacheName 放入待驱逐集合。
 * 不立即清除，等叫到 evictMarkedCaches 时统一处理。
 */
export const markCacheForEviction = (cacheName: string) => {
  cacheIdsToEvict.add(cacheName)
}

/**
 * 标记某个标签下所有页面为待驱逐，并标记该标签本身（用于「关闭标签」场景）。
 * tabIdsToEvict 中的标签 ID 会在 updatePageState 中被检测到，
 * 阻止被关闭的标签重新路由时意外复活。
 */
export const markTabPagesForEviction = (tab: { id: string; pages: { list(): ITabPage[] } }) => {
  for (const page of tab.pages.list()) markCacheForEviction(page.id)
  tabIdsToEvict.add(tab.id)
}

/**
 * 仅标记标签下所有页面为待驱逐，不标记标签本身（用于「续签/换页」场景）。
 * 适用于刷新标签：旧页面缓存清零，标签本身仍然存活，
 * 导航后由 updatePageState 重新创建页面。
 */
export const markTabPagesForEvictionOnly = (tab: { pages: { list(): ITabPage[] } }) => {
  for (const page of tab.pages.list()) markCacheForEviction(page.id)
}

/**
 * 将 cacheName 加入 <keep-alive> 的 include 列表（caches）。
 * 幂等：已存在时不重复添加，避免 include 数组中出现重复项
 * 影响 <keep-alive> 缓存范围，决定哪些 cacheComponent 实例会被保留。
 */
export const addCache = (cacheName: string) => {
  if (!caches.value.includes(cacheName)) caches.value.push(cacheName)
}

/**
 * 将 cacheName 从 include 列表（caches）中移除。
 * Vue 的 <keep-alive> 会以 flush:'post' 的 watcher 检测 include 变更，
 * 在下次渲染后自动销毁不再被 include 的缓存实例。
 */
export const removeCache = (cacheName: string) => {
  const i = caches.value.indexOf(cacheName)
  if (i >= 0) caches.value.splice(i, 1)
}

/**
 * 立即、同步、彻底驱逐单个页面的缓存。
 *
 * 操作步骤：
 * 1. 从 cacheIdsToEvict 移除（若存在，防止后续 evictMarkedCaches 二次处理）
 * 2. removeCache(cacheName)   → 从 <keep-alive> include 列表删除，触发 Vue 销毁缓存组件实例
 * 3. components.delete(...)   → 从 components Map 删除组件定义，
 *    使 resolvePageComponent 下次进入时必须重新创建全新的 cacheComponent 实例
 *
 * ⚠️ 调用时机要求：
 * 必须在 router.push() 完成（.then()）之后调用，
 * 不能在导航前调用，否则驱逐触发的响应式更新会导致 StackTabs 以旧路由重渲染，
 * 进而重建刚被删除的组件（竞态）。详见 useTabRouter.ts backward 的注释。
 */
export const evictPageCache = (cacheName: string) => {
  if (!cacheName) return
  cacheIdsToEvict.delete(cacheName)
  removeCache(cacheName)
  components.delete(cacheName)
}

/**
 * 执行所有已标记缓存的批量驱逐（由 cacheComponent 的 onActivated 调用）。
 *
 * 调用时机：
 * 当 cacheComponent 切换到激活（activated）状态时，说明用户切换到了一个新页面，
 * 相关的旧页面已经稳定进入「不活跃/待驱逐」状态，此时批量清理是安全的。
 */
export const evictMarkedCaches = () => {
  if (cacheIdsToEvict.size > 0) {
    for (const cacheName of [...cacheIdsToEvict]) {
      evictPageCache(cacheName)
    }
    cacheIdsToEvict.clear()
  }
}
