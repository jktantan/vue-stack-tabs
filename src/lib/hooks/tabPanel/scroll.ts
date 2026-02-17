/**
 * tabPanel/scroll - 滚动位置保存与恢复
 *
 * 职责：在切出/切入页面时保存和恢复滚动位置
 */
import { scrollPositionsByPageId } from './state'

/** 恢复指定页面的滚动位置 */
export const restoreScroller = (pageCacheId: string) => {
  const positions = scrollPositionsByPageId.get(pageCacheId)
  if (!positions) return
  for (const [sel, pos] of positions) {
    const el = document.querySelector(sel) as HTMLElement | null
    if (el) {
      el.scrollTop = pos.top
      el.scrollLeft = pos.left
    }
  }
}

/** 保存指定页面的滚动位置 */
export const saveScroller = (pageCacheId: string) => {
  const positions = scrollPositionsByPageId.get(pageCacheId)
  if (!positions) return
  for (const sel of positions.keys()) {
    const el = document.querySelector(sel) as HTMLElement | null
    positions.set(sel, {
      top: el?.scrollTop ?? 0,
      left: el?.scrollLeft ?? 0
    })
  }
}

/** 移除指定页面的滚动记录 */
export const removeScroller = (pageCacheId: string) => {
  const positions = scrollPositionsByPageId.get(pageCacheId)
  if (positions) {
    positions.clear()
    scrollPositionsByPageId.delete(pageCacheId)
  }
}

/** 为页面注册需要记录滚动位置的选择器 */
export const addPageScroller = (pageCacheId: string, ...selectorIds: string[]) => {
  if (!scrollPositionsByPageId.has(pageCacheId)) {
    scrollPositionsByPageId.set(pageCacheId, new Map<string, { top: number; left: number }>())
  }
  const positions = scrollPositionsByPageId.get(pageCacheId)!
  for (const sel of selectorIds) {
    positions.set(sel, { top: 0, left: 0 })
  }
}
