/**
 * tabPanel/scroll - 滚动位置保存与恢复
 *
 * 职责：基于当前 StackTabsRuntimeContext 在切出/切入页面时保存和恢复滚动位置。
 * 优化：用 MutationObserver 缓存 [data-stack-tab-scroll] 元素列表，
 *       避免每次 deactivate 都全量 querySelectorAll。
 */
import type { StackTabsRuntimeContext } from '../stackTabsContext'
import {
  readAdapterScrollPosition,
  writeAdapterScrollPosition,
  type StackTabsScrollAdapter
} from '../../model/ScrollAdapter'

export interface TabPanelScrollApi {
  restoreScroller: (pageCacheId: string) => void
  saveScroller: (pageCacheId: string) => void
  removeScroller: (pageCacheId: string) => void
  addPageScroller: (pageCacheId: string, ...selectorIds: string[]) => void
  /**
   * 注册页面的自定义滚动适配器。
   *
   * 传 null 表示该页面回退到默认 wrapper（`#W-<cacheName>`）路径。
   * getter 而不是适配器实例：运行时切换 `scrollContainer` 时，
   * 位置保存/恢复总是读取最新的适配器。
   */
  setPageScrollAdapter: (
    pageCacheId: string,
    getter: (() => StackTabsScrollAdapter | null) | null
  ) => void
}

/** 自定义滚动容器对应的主滚动位置 key；无自定义容器时仍使用 `#W-<cacheName>`。 */
const MAIN_SCROLLER_KEY = '__stack-tab-main-scroller__'

const resolveScrollElement = (selector: string): HTMLElement | null =>
  selector.startsWith('#')
    ? document.getElementById(selector.slice(1))
    : (document.querySelector(selector) as HTMLElement | null)

const AUTO_SCROLLER_PREFIX = '__stack-tab-auto-scroll__:'

interface AutoScrollCache {
  elements: HTMLElement[]
  observer: MutationObserver | null
}

/**
 * 在 pageRoot 上挂一个 MutationObserver，自动维护 [data-stack-tab-scroll] 元素列表；
 * 列表变化时无需上层主动失效，下次读到的就是最新值。
 */
const createAutoScrollCache = (pageRoot: HTMLElement): AutoScrollCache => {
  const collect = (): HTMLElement[] =>
    Array.from(pageRoot.querySelectorAll<HTMLElement>('[data-stack-tab-scroll]'))

  const cache: AutoScrollCache = {
    elements: collect(),
    observer: null
  }

  if (typeof MutationObserver !== 'undefined') {
    cache.observer = new MutationObserver(() => {
      cache.elements = collect()
    })
    // 仅监听子树增删与属性变化，不监听字符数据，减少开销。
    cache.observer.observe(pageRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-stack-tab-scroll']
    })
  }

  return cache
}

const autoScrollCaches = new Map<string, AutoScrollCache>()

const getAutoScrollCache = (pageCacheId: string): AutoScrollCache | null => {
  const pageRoot = document.getElementById(`W-${pageCacheId}`)
  if (!pageRoot) {
    autoScrollCaches.delete(pageCacheId)
    return null
  }

  let cache = autoScrollCaches.get(pageCacheId)
  if (!cache) {
    cache = createAutoScrollCache(pageRoot)
    autoScrollCaches.set(pageCacheId, cache)
  } else {
    // 防御：检查 pageRoot 是否已被替换（极端情况：同一 pageCacheId 重新挂载）
    if (cache.elements.length === 0 && cache.observer) {
      cache.elements = Array.from(pageRoot.querySelectorAll<HTMLElement>('[data-stack-tab-scroll]'))
    }
  }
  return cache
}

const getAutoScrollerKey = (index: number): string => `${AUTO_SCROLLER_PREFIX}${index}`

const resolveAutoScrollElement = (pageCacheId: string, key: string): HTMLElement | null => {
  const index = Number(key.slice(AUTO_SCROLLER_PREFIX.length))
  if (!Number.isInteger(index)) return null
  const cache = getAutoScrollCache(pageCacheId)
  return cache?.elements[index] ?? null
}

export const createTabPanelScroll = (context: StackTabsRuntimeContext): TabPanelScrollApi => {
  const { scrollPositionsByPageId } = context
  /** 已注册自定义滚动容器的页面；值为读取最新适配器的 getter。 */
  const adapterGetters = new Map<string, () => StackTabsScrollAdapter | null>()

  const getPageAdapter = (pageCacheId: string): StackTabsScrollAdapter | null =>
    adapterGetters.get(pageCacheId)?.() ?? null

  const restoreScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    // 先恢复页面内其它滚动元素，最后恢复主滚动容器：
    // 运行时切换滚动组件时，普通 key 可能仍指向旧 wrapper，最后写入主位置可避免被覆盖。
    for (const [selector, position] of positions) {
      if (selector === MAIN_SCROLLER_KEY) continue
      const element = selector.startsWith(AUTO_SCROLLER_PREFIX)
        ? resolveAutoScrollElement(pageCacheId, selector)
        : resolveScrollElement(selector)
      if (element) {
        element.scrollTop = position.top
        element.scrollLeft = position.left
      }
    }

    const mainPosition = positions.get(MAIN_SCROLLER_KEY)
    if (!mainPosition) return
    const adapter = getPageAdapter(pageCacheId)
    if (adapter && writeAdapterScrollPosition(adapter, mainPosition)) return
    // 自定义组件被移除（切换回默认路径）或适配器暂时不可用时回退 wrapper。
    const wrapper = document.getElementById(`W-${pageCacheId}`)
    if (wrapper) {
      wrapper.scrollTop = mainPosition.top
      wrapper.scrollLeft = mainPosition.left
    }
  }

  const saveScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    // 自定义滚动容器存在时，主滚动位置由适配器读写；wrapper 不再承载滚动，
    // 必须跳过 `#W-...` 的 DOM 读取，否则会把 0 写入位置缓存。
    if (adapterGetters.has(pageCacheId)) {
      positions.delete(`#W-${pageCacheId}`)
      const position = readAdapterScrollPosition(getPageAdapter(pageCacheId))
      if (position) positions.set(MAIN_SCROLLER_KEY, position)
    }

    // 与当前页面 DOM 同步自动标记的容器；移除的元素不保留过期位置。
    for (const key of positions.keys()) {
      if (key.startsWith(AUTO_SCROLLER_PREFIX)) positions.delete(key)
    }
    const cache = getAutoScrollCache(pageCacheId)
    const elements = cache?.elements ?? []
    elements.forEach((element, index) => {
      positions.set(getAutoScrollerKey(index), {
        top: element.scrollTop,
        left: element.scrollLeft
      })
    })

    for (const selector of positions.keys()) {
      // auto key 已在上一步按 DOM 顺序写入，主滚动位置由适配器维护，均无需再次解析。
      if (selector.startsWith(AUTO_SCROLLER_PREFIX) || selector === MAIN_SCROLLER_KEY) continue
      const element = resolveScrollElement(selector)
      positions.set(selector, {
        top: element?.scrollTop ?? 0,
        left: element?.scrollLeft ?? 0
      })
    }
  }

  const removeScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (positions) {
      positions.clear()
      scrollPositionsByPageId.delete(pageCacheId)
    }
    adapterGetters.delete(pageCacheId)
    // 同步卸载 MutationObserver，避免页面被驱逐后 observer 仍持有 DOM 引用。
    const cache = autoScrollCaches.get(pageCacheId)
    if (cache) {
      cache.observer?.disconnect()
      autoScrollCaches.delete(pageCacheId)
    }
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

  const setPageScrollAdapter = (
    pageCacheId: string,
    getter: (() => StackTabsScrollAdapter | null) | null
  ): void => {
    if (!getter) {
      adapterGetters.delete(pageCacheId)
      return
    }
    adapterGetters.set(pageCacheId, getter)
    if (!scrollPositionsByPageId.has(pageCacheId)) {
      scrollPositionsByPageId.set(pageCacheId, new Map())
    }
    const positions = scrollPositionsByPageId.get(pageCacheId)!
    if (!positions.has(MAIN_SCROLLER_KEY)) {
      positions.set(MAIN_SCROLLER_KEY, { top: 0, left: 0 })
    }
  }

  return {
    restoreScroller,
    saveScroller,
    removeScroller,
    addPageScroller,
    setPageScrollAdapter
  }
}
