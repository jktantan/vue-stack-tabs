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

const AUTO_SCROLLER_PREFIX = '__stack-tab-auto-scroll__:'

/**
 * 返回当前缓存页面内显式标记的内部滚动容器。
 * 只查询 data-stack-tab-scroll，不扫描全部 DOM，避免标签切换时产生额外开销。
 */
const getAutoScrollElements = (pageCacheId: string): HTMLElement[] => {
  const pageRoot = document.getElementById(`W-${pageCacheId}`)
  return pageRoot
    ? Array.from(pageRoot.querySelectorAll<HTMLElement>('[data-stack-tab-scroll]'))
    : []
}

const getAutoScrollerKey = (index: number): string => `${AUTO_SCROLLER_PREFIX}${index}`

const resolveAutoScrollElement = (pageCacheId: string, key: string): HTMLElement | null => {
  const index = Number(key.slice(AUTO_SCROLLER_PREFIX.length))
  return Number.isInteger(index) ? (getAutoScrollElements(pageCacheId)[index] ?? null) : null
}

export const createTabPanelScroll = (context: StackTabsRuntimeContext): TabPanelScrollApi => {
  const { scrollPositionsByPageId } = context

  const restoreScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    for (const [selector, position] of positions) {
      const element = selector.startsWith(AUTO_SCROLLER_PREFIX)
        ? resolveAutoScrollElement(pageCacheId, selector)
        : resolveScrollElement(selector)
      if (element) {
        element.scrollTop = position.top
        element.scrollLeft = position.left
      }
    }
  }

  const saveScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    // 与当前页面 DOM 同步自动标记的容器；移除的元素不保留过期位置。
    for (const key of positions.keys()) {
      if (key.startsWith(AUTO_SCROLLER_PREFIX)) positions.delete(key)
    }
    getAutoScrollElements(pageCacheId).forEach((element, index) => {
      positions.set(getAutoScrollerKey(index), {
        top: element.scrollTop,
        left: element.scrollLeft
      })
    })

    for (const selector of positions.keys()) {
      const element = selector.startsWith(AUTO_SCROLLER_PREFIX)
        ? resolveAutoScrollElement(pageCacheId, selector)
        : resolveScrollElement(selector)
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
