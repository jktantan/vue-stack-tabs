/**
 * tabPanel/scroll - 滚动位置保存与恢复
 *
 * 职责：基于当前 StackTabsRuntimeContext 在切出/切入页面时保存和恢复滚动位置。
 */
import type { StackTabsRuntimeContext } from '../stackTabsContext'

export interface TabPanelScrollApi {
  restoreScroller: (pageCacheId: string) => void
  saveScroller: (pageCacheId: string) => void
  removeScroller: (pageCacheId: string) => void
  addPageScroller: (pageCacheId: string, ...selectorIds: string[]) => void
}

const resolveScrollElement = (selector: string): HTMLElement | null =>
  selector.startsWith('#')
    ? document.getElementById(selector.slice(1))
    : (document.querySelector(selector) as HTMLElement | null)

export const createTabPanelScroll = (context: StackTabsRuntimeContext): TabPanelScrollApi => {
  const { scrollPositionsByPageId } = context

  const restoreScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    for (const [selector, position] of positions) {
      const element = resolveScrollElement(selector)
      if (element) {
        element.scrollTop = position.top
        element.scrollLeft = position.left
      }
    }
  }

  const saveScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    for (const selector of positions.keys()) {
      const element = resolveScrollElement(selector)
      positions.set(selector, {
        top: element?.scrollTop ?? 0,
        left: element?.scrollLeft ?? 0
      })
    }
  }

  const removeScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    positions.clear()
    scrollPositionsByPageId.delete(pageCacheId)
  }

  const addPageScroller = (pageCacheId: string, ...selectorIds: string[]): void => {
    if (!scrollPositionsByPageId.has(pageCacheId)) {
      scrollPositionsByPageId.set(pageCacheId, new Map())
    }
    const positions = scrollPositionsByPageId.get(pageCacheId)!
    for (const selector of selectorIds) {
      positions.set(selector, { top: 0, left: 0 })
    }
  }

  return {
    restoreScroller,
    saveScroller,
    removeScroller,
    addPageScroller
  }
}
