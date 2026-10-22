/**
 * tabPanel/tabStore - 标签/页面栈的唯一状态入口
 *
 * 内部使用规范化的三张“表”保存状态：
 * - tabOrder + tabsById：标签顺序与标签记录
 * - pageIdsByTabId：标签到页面 id 的一对多关系
 * - pagesById：页面记录
 *
 * 对外仍通过 tabs Ref 暴露兼容的 ITabItem[]；每个 tab.pages 是 PageStackView，
 * 读写会转发到 store，因此渲染层与公开类型不需要感知内部结构变化。
 *
 * 注意：本模块不依赖 vue-router，也不触发业务事件；路由事务与事件由 useTabPanel /
 * useTabRouter 等上层编排。
 */
import { markRaw, reactive, ref } from 'vue'
import type { DefineComponent } from 'vue'
import type { ITabItem, ITabPage } from '../../model/TabModel'
import { Stack } from '../../model/TabModel'
import { clonePage } from '../../utils/urlParser'
import type { StackTabsRuntimeContext } from '../stackTabsContext'
import { createTabPanelEviction, type TabPanelEvictionApi } from './evict'

export interface RemoveTabResult {
  status: 'not-found' | 'not-closable' | 'removed'
  removed: ITabItem | null
  /** 关闭后应激活的相邻标签；没有可激活标签时为空字符串 */
  nextActiveId: string
}

export interface PageUpdate {
  tabId: string
  pageId: string
  patch: PagePatch
}

/** updatePage 允许修改的字段；页面身份与刷新版本必须通过 store 写入 */
export interface PagePatch {
  id?: string
  refreshVersion?: number
  _backParams?: Record<string, unknown>
}

export interface TabStoreApi extends TabPanelEvictionApi {
  // ---- 查询 ----
  /** 返回标签列表的只读视图（运行时为同一个响应式数组） */
  getTabs: () => readonly ITabItem[]
  getTab: (id: string) => ITabItem | null
  getActiveTab: () => ITabItem | null
  /** 查找栈顶页面 path 与给定 path 相同的标签 */
  findTabByTopPagePath: (path: string) => ITabItem | null
  hasTab: (id: string) => boolean
  canAddTab: () => boolean
  getPages: (tabId: string) => readonly ITabPage[]
  getTopPage: (tabId: string) => ITabPage | null
  /** 读取任意页面的刷新版本；渲染层据此只重建对应页面 */
  getPageRefreshVersion: (pageId: string) => number
  /** 返回深拷贝的页面栈快照，可直接用于 rollback */
  getPageSnapshot: (tabId: string) => ITabPage[]

  // ---- 标签写入 ----
  addTab: (tab: ITabItem) => void
  addTabs: (tabs: readonly ITabItem[]) => void
  /** 唯一 active 写入口 */
  activateTab: (id: string) => ITabItem | null
  /** 动态更新标签标题；返回 false 表示标签不存在 */
  updateTabTitle: (id: string, title: string) => boolean
  moveTab: (id: string, targetIndex: number) => boolean
  removeTab: (id: string) => RemoveTabResult
  removeTabs: (shouldRemove: (tab: ITabItem, index: number) => boolean) => ITabItem[]

  // ---- 页面栈写入 ----
  appendPage: (tabId: string, page: ITabPage) => void
  /** 从栈顶弹出若干页，返回被弹出的页面（由调用方决定驱逐/回滚） */
  popPages: (tabId: string, steps: number) => ITabPage[]
  /** 用给定页面替换整个栈（内部深拷贝页面） */
  replacePages: (tabId: string, pages: readonly ITabPage[]) => void
  clearPages: (tabId: string) => void
  /** 修改页面字段（id / refreshVersion / _backParams）；仅 id 变化时重建 tabs 数组 */
  updatePage: (tabId: string, pageId: string, patch: PagePatch) => boolean
  /** 批量修改页面字段，最后最多重建一次 tabs 数组（供 refreshAllTabs 使用） */
  updatePages: (updates: readonly PageUpdate[]) => void
  /** 取出并清除栈顶页面的 _backParams；pageId 不是当前栈顶时返回 null */
  consumeBackParams: (tabId: string, pageId: string) => Record<string, unknown> | null

  // ---- 驱逐标记辅助 ----
  isTabMarkedForEviction: (id: string) => boolean
  isCacheMarkedForEviction: (id: string) => boolean
  unmarkCacheForEviction: (id: string) => void
  clearTabEvictionMarks: () => void

  // ---- 组件注册表 ----
  getComponent: (id: string) => DefineComponent | undefined
  setComponent: (id: string, component: DefineComponent) => void
  deleteComponent: (id: string) => void
  snapshotComponents: () => Map<string, DefineComponent>
  restoreComponents: (snapshot: Map<string, DefineComponent>) => void

  // ---- 缓存快照 / 响应式 ----
  snapshotCaches: () => string[]
  restoreCaches: (cacheNames: readonly string[]) => void
  /** 通知依赖 tabs 的计算属性重新求值（如 activePageRefreshVersion） */
  touchTabs: () => void

  // ---- 生命周期 ----
  /** 清空 tabs / caches / components / 驱逐标记，供 destroy 使用 */
  reset: () => void
}

/** 标签表中保存的纯净记录；active 由 activeTabId 派生 */
interface TabRecord {
  id: string
  title: string
  closable: boolean
  refreshable: boolean
  iframe: boolean
  iframeRefreshMode?: 'postMessage' | 'reload'
  url?: string
  /** 固定在标签栏最前方，不可拖动，其他标签也不能排到它前面 */
  pinned?: boolean
}

interface PageStackAccess {
  getPages: (tabId: string) => readonly ITabPage[]
  getTopPage: (tabId: string) => ITabPage | null
  /** 读取任意页面的刷新版本；渲染层据此只重建对应页面 */
  getPageRefreshVersion: (pageId: string) => number
  appendPage: (tabId: string, page: ITabPage) => void
  popPages: (tabId: string, steps: number) => ITabPage[]
  clearPages: (tabId: string) => void
}

/**
 * 兼容视图：继承 Stack 以保持 ITabItem.pages 的类型不变，
 * 所有读写都转发给 store 的规范化状态。
 */
class PageStackView extends Stack<ITabPage> {
  private readonly tabId: string
  private readonly access: PageStackAccess

  constructor(tabId: string, access: PageStackAccess) {
    super()
    this.tabId = tabId
    this.access = access
  }

  override push(page: ITabPage): void {
    this.access.appendPage(this.tabId, page)
  }

  override pop(): ITabPage | undefined {
    return this.access.popPages(this.tabId, 1)[0]
  }

  override peek(): ITabPage | undefined {
    return this.access.getTopPage(this.tabId) ?? undefined
  }

  override at(index: number): ITabPage | undefined {
    return this.access.getPages(this.tabId)[index]
  }

  override isEmpty(): boolean {
    return this.access.getPages(this.tabId).length === 0
  }

  override size(): number {
    return this.access.getPages(this.tabId).length
  }

  override clear(): void {
    this.access.clearPages(this.tabId)
  }

  override list(): ITabPage[] {
    return [...this.access.getPages(this.tabId)]
  }

  override readonlyList(): readonly ITabPage[] {
    return this.access.getPages(this.tabId)
  }

  override find(predicate: (element: ITabPage, index: number) => boolean): ITabPage | undefined {
    return this.list().find(predicate)
  }

  override findIndex(predicate: (element: ITabPage, index: number) => boolean): number {
    return this.list().findIndex(predicate)
  }

  override filter(predicate: (element: ITabPage, index: number) => boolean): ITabPage[] {
    return this.list().filter(predicate)
  }

  override some(predicate: (element: ITabPage, index: number) => boolean): boolean {
    return this.list().some(predicate)
  }

  override forEachTopDown(visit: (element: ITabPage, index: number) => void): void {
    const pages = this.list()
    for (let index = pages.length - 1; index >= 0; index--) {
      visit(pages[index] as ITabPage, index)
    }
  }

  override toJSON(): ITabPage[] {
    return this.list()
  }

  override toString(): string {
    return this.list().toString()
  }
}

const createTabStore = (context: StackTabsRuntimeContext): TabStoreApi => {
  const { tabs, caches, components, cacheIdsToEvict, tabIdsToEvict } = context
  const eviction = createTabPanelEviction(context)

  // ---- 规范化状态 ----
  const tabOrder = ref<string[]>([])
  const tabsById = reactive(new Map<string, TabRecord>())
  const pageIdsByTabId = reactive(new Map<string, string[]>())
  const pagesById = reactive(new Map<string, ITabPage>())
  const activeTabId = ref('')
  /** 稳定的兼容视图，保证 TabHeader 等使用方的对象身份不变 */
  const tabViews = new Map<string, ITabItem>()

  // ---- 查询 ----
  const getTabs = (): readonly ITabItem[] => tabs.value

  // 返回 tabs.value 中的对象（深度代理后的视图），保持调用方的对象身份比较语义。
  const getTab = (id: string): ITabItem | null => tabs.value.find((tab) => tab.id === id) ?? null

  const getActiveTab = (): ITabItem | null => tabs.value.find((tab) => tab.active) ?? null

  const getPageIds = (tabId: string): readonly string[] => pageIdsByTabId.get(tabId) ?? []

  const getPages = (tabId: string): readonly ITabPage[] => {
    const ids = pageIdsByTabId.get(tabId)
    if (!ids || ids.length === 0) return []
    const pages: ITabPage[] = []
    for (const id of ids) {
      const page = pagesById.get(id)
      if (page) pages.push(page)
    }
    return pages
  }

  const getTopPage = (tabId: string): ITabPage | null => {
    const ids = pageIdsByTabId.get(tabId)
    if (!ids || ids.length === 0) return null
    return pagesById.get(ids[ids.length - 1] as string) ?? null
  }

  const getPageRefreshVersion = (pageId: string): number =>
    pagesById.get(pageId)?.refreshVersion ?? 0

  const findTabByTopPagePath = (path: string): ITabItem | null => {
    // 直接遍历 tabViews，避免原先「getTopPage + getTab(find)」的 O(n²) 组合。
    for (const id of tabOrder.value) {
      if (getTopPage(id)?.path === path) return tabViews.get(id) ?? null
    }
    return null
  }

  const hasTab = (id: string): boolean => tabsById.has(id)

  const canAddTab = (): boolean =>
    context.maxTabCount.value <= 0 ||
    (context.maxTabCount.value > 0 && context.maxTabCount.value > tabOrder.value.length)

  const getPageSnapshot = (tabId: string): ITabPage[] =>
    getPages(tabId).map((page) => clonePage(page))

  // ---- 标签写入 ----
  const toRecord = (tab: ITabItem): TabRecord => ({
    id: tab.id,
    title: tab.title,
    closable: tab.closable,
    refreshable: tab.refreshable,
    iframe: tab.iframe,
    iframeRefreshMode: tab.iframeRefreshMode,
    url: tab.url,
    pinned: tab.pinned
  })

  const registerTab = (tab: ITabItem): void => {
    tabsById.set(tab.id, toRecord(tab))

    const pages = tab.pages.list()
    const pageIds = pages.map((page) => page.id)
    for (const page of pages) pagesById.set(page.id, page)
    pageIdsByTabId.set(tab.id, pageIds)

    tabViews.delete(tab.id)
    if (!tabOrder.value.includes(tab.id)) {
      tabOrder.value = [...tabOrder.value, tab.id]
    }
    if (tab.active) activeTabId.value = tab.id
  }

  const addTab = (tab: ITabItem): void => {
    registerTab(tab)
    syncTabsView()
  }

  const addTabs = (newTabs: readonly ITabItem[]): void => {
    if (newTabs.length === 0) return
    for (const tab of newTabs) registerTab(tab)
    syncTabsView()
  }

  const activateTab = (id: string): ITabItem | null => {
    const nextId = tabsById.has(id) ? id : ''
    // 重复激活同一标签（页面内导航经常走到这里）无需重建 tabs 数组。
    if (nextId !== activeTabId.value) {
      activeTabId.value = nextId
      syncTabsView()
    }
    return getTab(id)
  }

  const updateTabTitle = (id: string, title: string): boolean => {
    const record = tabsById.get(id)
    if (!record) return false
    if (record.title === title) return true
    record.title = title
    syncTabsView()
    return true
  }

  const moveTab = (id: string, targetIndex: number): boolean => {
    const order = tabOrder.value
    const sourceIndex = order.indexOf(id)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return false
    }

    // pinned 标签（home）固定在最前方：自身不可移动，其他标签也不得插到它前面。
    const sourceRecord = tabsById.get(id)
    if (!sourceRecord || sourceRecord.pinned) return false

    let firstUnpinnedIndex = 0
    for (let index = 0; index < order.length; index++) {
      if (tabsById.get(order[index] as string)?.pinned) firstUnpinnedIndex = index + 1
    }
    const safeTargetIndex = Math.max(targetIndex, firstUnpinnedIndex)
    if (safeTargetIndex >= order.length || safeTargetIndex === sourceIndex) return false

    const reordered = [...order]
    const [tabId] = reordered.splice(sourceIndex, 1)
    if (!tabId) return false
    reordered.splice(safeTargetIndex, 0, tabId)
    tabOrder.value = reordered
    syncTabsView()
    return true
  }

  const removeTab = (id: string): RemoveTabResult => {
    const order = tabOrder.value
    const index = order.indexOf(id)
    if (index < 0) return { status: 'not-found', removed: null, nextActiveId: '' }

    const record = tabsById.get(id)
    if (!record || !record.closable) {
      return { status: 'not-closable', removed: null, nextActiveId: id }
    }

    const removed = materializeTab(id)
    const wasActive = activeTabId.value === id
    if (removed) eviction.markTabPagesForEviction(removed)

    for (const pageId of getPageIds(id)) pagesById.delete(pageId)
    pageIdsByTabId.delete(id)
    tabsById.delete(id)
    tabViews.delete(id)

    let nextActiveId = ''
    if (order.length > 1 && wasActive) {
      nextActiveId = (index === 0 ? order[1] : order[index - 1]) ?? ''
    }
    if (wasActive) activeTabId.value = ''

    tabOrder.value = order.filter((tabId) => tabId !== id)
    syncTabsView()

    // 非激活标签关闭后没有 onActivated 兜底，立即执行驱逐。
    if (!wasActive) {
      eviction.evictMarkedCaches()
      tabIdsToEvict.clear()
    }

    return { status: 'removed', removed, nextActiveId }
  }

  const removeTabs = (shouldRemove: (tab: ITabItem, index: number) => boolean): ITabItem[] => {
    const removed: ITabItem[] = []
    const remaining: string[] = []

    tabOrder.value.forEach((id, index) => {
      const record = tabsById.get(id)
      const tab = materializeTab(id)
      if (!record || !tab) return
      if (!record.closable || !shouldRemove(tab, index)) {
        remaining.push(id)
        return
      }

      eviction.markTabPagesForEviction(tab)
      for (const pageId of getPageIds(id)) pagesById.delete(pageId)
      pageIdsByTabId.delete(id)
      tabsById.delete(id)
      tabViews.delete(id)
      if (activeTabId.value === id) activeTabId.value = ''
      removed.push(tab)
    })

    tabOrder.value = remaining
    syncTabsView()
    return removed
  }

  // ---- 页面栈写入 ----
  // 页面栈只修改 pageIdsByTabId / pagesById（两者都是响应式 Map），
  // 不重建 tabs 数组：标签栏、iframe 与刷新版本计算都无需因入栈/出栈重新求值。
  const appendPage = (tabId: string, page: ITabPage): void => {
    if (!tabsById.has(tabId)) return
    const ids = pageIdsByTabId.get(tabId) ?? []
    pageIdsByTabId.set(tabId, [...ids, page.id])
    pagesById.set(page.id, page)
  }

  const popPages = (tabId: string, steps: number): ITabPage[] => {
    if (!tabsById.has(tabId) || steps <= 0) return []

    const ids = [...(pageIdsByTabId.get(tabId) ?? [])]
    const popped: ITabPage[] = []
    for (let index = 0; index < steps; index++) {
      const pageId = ids.pop()
      if (!pageId) break
      const page = pagesById.get(pageId)
      if (page) popped.push(page)
      pagesById.delete(pageId)
    }
    pageIdsByTabId.set(tabId, ids)
    return popped
  }

  const replacePages = (tabId: string, pages: readonly ITabPage[]): void => {
    if (!tabsById.has(tabId)) return

    for (const pageId of getPageIds(tabId)) pagesById.delete(pageId)
    const nextPageIds: string[] = []
    for (const page of pages) {
      const cloned = clonePage(page)
      pagesById.set(cloned.id, cloned)
      nextPageIds.push(cloned.id)
    }
    pageIdsByTabId.set(tabId, nextPageIds)
  }

  const clearPages = (tabId: string): void => {
    if (!tabsById.has(tabId)) return
    for (const pageId of getPageIds(tabId)) pagesById.delete(pageId)
    pageIdsByTabId.set(tabId, [])
  }

  const applyPagePatch = (
    tabId: string,
    pageId: string,
    patch: PagePatch
  ): 'missing' | 'conflict' | 'same-id' | 'new-id' => {
    const ids = pageIdsByTabId.get(tabId)
    if (!ids || !ids.includes(pageId)) return 'missing'

    const page = pagesById.get(pageId)
    if (!page) return 'missing'
    if (patch.id && patch.id !== pageId && pagesById.has(patch.id)) return 'conflict'

    Object.assign(page, patch)
    if (patch.id && patch.id !== pageId) {
      pagesById.delete(pageId)
      pagesById.set(patch.id, page)
      pageIdsByTabId.set(
        tabId,
        ids.map((id) => (id === pageId ? (patch.id as string) : id))
      )
      return 'new-id'
    }
    return 'same-id'
  }

  /**
   * 刷新版本、_backParams 都是 page 上的响应式字段，读取方会自行更新；
   * 只有页面 id 变化才需要重建 tabs 视图，避免刷新一个标签就 diff 整个标签栏。
   */
  const updatePage = (tabId: string, pageId: string, patch: PagePatch): boolean => {
    const result = applyPagePatch(tabId, pageId, patch)
    if (result === 'missing' || result === 'conflict') return false
    if (result === 'new-id') syncTabsView()
    return true
  }

  const updatePages = (updates: readonly PageUpdate[]): void => {
    let needsSync = false
    for (const update of updates) {
      if (applyPagePatch(update.tabId, update.pageId, update.patch) === 'new-id') {
        needsSync = true
      }
    }
    if (needsSync) syncTabsView()
  }

  const consumeBackParams = (tabId: string, pageId: string): Record<string, unknown> | null => {
    const top = getTopPage(tabId)
    if (!top || top.id !== pageId || !top._backParams) return null
    const backParams = { ...top._backParams }
    // _backParams 是页面对象上的响应式字段，删除后读取方会自行更新。
    delete top._backParams
    return backParams
  }

  // ---- 缓存与组件注册表 ----
  const snapshotCaches = (): string[] => [...caches.value]

  const restoreCaches = (cacheNames: readonly string[]): void => {
    caches.value = [...cacheNames]
  }

  const snapshotComponents = (): Map<string, DefineComponent> => new Map(components)

  const restoreComponents = (snapshot: Map<string, DefineComponent>): void => {
    components.clear()
    for (const [id, component] of snapshot) components.set(id, component)
  }

  const reset = (): void => {
    tabOrder.value = []
    tabsById.clear()
    pageIdsByTabId.clear()
    pagesById.clear()
    tabViews.clear()
    activeTabId.value = ''
    tabs.value = []
    caches.value = []
    components.clear()
    cacheIdsToEvict.clear()
    tabIdsToEvict.clear()
  }

  // ---- 兼容视图 ----
  const pageAccess: PageStackAccess = {
    getPages,
    getTopPage,
    getPageRefreshVersion,
    appendPage,
    popPages,
    clearPages
  }

  function materializeTab(id: string): ITabItem | null {
    const record = tabsById.get(id)
    if (!record) return null

    let view = tabViews.get(id)
    if (!view) {
      view = {
        id: record.id,
        title: record.title,
        closable: record.closable,
        refreshable: record.refreshable,
        iframe: record.iframe,
        iframeRefreshMode: record.iframeRefreshMode,
        url: record.url,
        active: activeTabId.value === id,
        // pages 的读写都转发给 store，本身不需要被 ref 深度代理。
        pages: markRaw(new PageStackView(id, pageAccess)),
        pinned: record.pinned
      }
      tabViews.set(id, view)
    } else {
      view.title = record.title
      view.closable = record.closable
      view.refreshable = record.refreshable
      view.iframe = record.iframe
      view.active = activeTabId.value === id
      view.pinned = record.pinned
      if (record.iframeRefreshMode === undefined) {
        delete view.iframeRefreshMode
      } else {
        view.iframeRefreshMode = record.iframeRefreshMode
      }
      if (record.url === undefined) {
        delete view.url
      } else {
        view.url = record.url
      }
    }
    return view
  }

  function syncTabsView(): void {
    const next: ITabItem[] = []
    for (const id of tabOrder.value) {
      const view = materializeTab(id)
      if (view) next.push(view)
    }
    tabs.value = next
  }

  return {
    ...eviction,
    getTabs,
    getTab,
    getActiveTab,
    findTabByTopPagePath,
    hasTab,
    canAddTab,
    getPages,
    getTopPage,
    getPageRefreshVersion,
    getPageSnapshot,
    addTab,
    addTabs,
    activateTab,
    updateTabTitle,
    moveTab,
    removeTab,
    removeTabs,
    appendPage,
    popPages,
    replacePages,
    clearPages,
    updatePage,
    updatePages,
    consumeBackParams,
    isTabMarkedForEviction: (id) => tabIdsToEvict.has(id),
    isCacheMarkedForEviction: (id) => cacheIdsToEvict.has(id),
    unmarkCacheForEviction: (id) => cacheIdsToEvict.delete(id),
    clearTabEvictionMarks: () => tabIdsToEvict.clear(),
    getComponent: (id) => components.get(id),
    setComponent: (id, component) => components.set(id, component),
    deleteComponent: (id) => components.delete(id),
    snapshotComponents,
    restoreComponents,
    snapshotCaches,
    restoreCaches,
    touchTabs: syncTabsView,
    reset
  }
}

const storesByContext = new WeakMap<StackTabsRuntimeContext, TabStoreApi>()

/**
 * 每个运行时上下文只创建一个 store。
 *
 * useTabPanel 会被 StackKeepAlive、StackCacheRenderer、页面内的 useTabRouter 多次调用；
 * 复用同一实例可避免 eviction 的 Set/数组出现多份互相不同步的状态。
 */
export const getTabStore = (context: StackTabsRuntimeContext): TabStoreApi => {
  const existing = storesByContext.get(context)
  if (existing) return existing

  const store = createTabStore(context)
  storesByContext.set(context, store)
  return store
}
