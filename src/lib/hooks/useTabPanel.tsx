/**
 * useTabPanel - 标签页核心 Hook
 *
 * 职责：
 * 1. 管理标签列表 (tabs)、每个标签内的页面栈 (pages)
 * 2. 管理 keep-alive 的缓存列表 (caches)、组件映射 (components)
 * 3. 处理关闭/出栈时的缓存驱逐（标记 + 延迟执行）
 * 4. 处理刷新（通过 exclude 触发重挂载，不销毁组件定义）
 * 5. 滚动位置保存与恢复
 * 6. Session 持久化（刷新后恢复上次激活的标签）
 *
 * 使用范围：内部 hook，由 StackTabs、useTabActions、useTabRouter、ContextMenu 调用
 */
import type { ITabBase, ITabData, ITabItem, ITabPage } from '../model/TabModel'
import { computed, ref } from 'vue'
import type { DefineComponent, VNode } from 'vue'
import { isNavigationFailure, useRouter } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { encodeTabInfo, createId, createPageId, decodeTabInfo } from '../utils/tabInfoEncoder'
import { defu } from 'defu'
import { Stack } from '../model/TabModel'
import {
  parseUrl,
  isCrossOriginUrl,
  omitStackTabsReservedQuery,
  toSafeTabUrl,
  decodeSafeTabUrl,
  cloneLocationQuery,
  isSameQueryIgnoringReserved,
  normalizePathname
} from '../utils/urlParser'
import { TabEventType, useTabEmitter } from './useTabEventBus'
import { runNavigationTransaction } from './tabPanel/navigationTransaction'
import { useI18n } from 'vue-i18n-lite'

import { resolveStackTabsRuntimeContext, type StackTabsRuntimeContext } from './stackTabsContext'
import { getTabStore } from './tabPanel/tabStore'
import { createTabPanelScroll } from './tabPanel/scroll'
import { createTabPanelSession } from './tabPanel/session'
import { createTabPanelRefresh } from './tabPanel/refresh'
import { createPageComponentFactory } from './tabPanel/pageComponentFactory'
import { getEmptyPlaceholderComponent } from '../components/StackKeepAlive/emptyPlaceholder'

const cloneRouteQuery = (route: RouteLocationNormalizedLoaded, tabInfo: ITabBase) => ({
  ...cloneLocationQuery(route.query),
  __tab: route.query.__tab ?? encodeTabInfo(tabInfo)
})

/** homeTab 未显式指定 id 时使用的固定 id，保证刷新前后 __tab 与标签身份一致。 */
const DEFAULT_HOME_TAB_ID = '__stack_tabs_home__'

/** 规范化路径（nginx 等可能加尾部斜杠） */
export const normalizePathForCache = (route: RouteLocationNormalizedLoaded): string => {
  const lastMatch = route.matched[route.matched.length - 1]
  const matchPath = lastMatch?.path ?? route.path
  const path = route.path.endsWith('/') ? route.path.slice(0, -1) : route.path
  return matchPath === path ? path : route.path
}

const createTabPanelApi = (runtimeContext: StackTabsRuntimeContext) => {
  const router = useRouter()
  const emitter = useTabEmitter(runtimeContext)
  const { t } = useI18n()
  const { tabs, defaultTabs, caches, refreshKey, iframeRefreshKeys, isInitialized } = runtimeContext
  const store = getTabStore(runtimeContext)
  const {
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
    updateTabTitle: updateTabTitleInStore,
    moveTab,
    removeTab: removeTabFromStore,
    removeTabs: removeTabsFromStore,
    appendPage,
    popPages,
    replacePages,
    clearPages,
    updatePage,
    updatePages,
    consumeBackParams,
    markCacheForEviction,
    markTabPagesForEvictionOnly,
    addCache,
    removeCache,
    evictMarkedCaches,
    evictPageCache,
    replacePageCaches,
    isTabMarkedForEviction,
    isCacheMarkedForEviction,
    unmarkCacheForEviction,
    clearTabEvictionMarks,
    getComponent,
    setComponent,
    deleteComponent,
    snapshotComponents,
    restoreComponents,
    snapshotCaches,
    restoreCaches,
    reset: resetStore
  } = store
  const { restoreScroller, saveScroller, removeScroller, addPageScroller } =
    createTabPanelScroll(runtimeContext)
  const {
    saveActiveTabToSession,
    clearSession,
    restoreTabFromSession,
    restoreActiveTabSession,
    getSessionKey
  } = createTabPanelSession(runtimeContext)

  const size = (): number => getTabs().length

  /**
   * 初始化：先创建固定首页（homeTab），再创建 defaultTabs，并尝试从 sessionStorage 恢复上次激活的标签
   * @param staticTabs - 初始标签配置
   * @param homeTab - 固定首页；始终位于第一位、不可关闭、不可移动
   */
  const initialize = (staticTabs: ITabData[], homeTab?: ITabData) => {
    // 重复调用会累加 defaultTabs 并重复注册标签；初始化后直接忽略。
    if (isInitialized.value) {
      if (!import.meta.env.PROD) {
        console.warn('[vue-stack-tabs] initialize() called more than once; ignored.')
      }
      return
    }
    const newDefaults: ITabItem[] = []
    const newTabs: ITabItem[] = []
    let homeTabId = ''

    /** 由 ITabData 构建运行时标签；homeTab 通过 options 强制固定属性 */
    const buildTab = (
      item: ITabData,
      options: { pinned?: boolean; closable?: boolean } = {}
    ): ITabItem => {
      // 先用默认值填充非空缺字段，避免在循环里提前求值生成用不到的 UUID。
      const fullItem = defu(item, {
        refreshable: true,
        closable: true,
        iframe: false
      })
      // homeTab 未指定 id 时使用固定 id，避免每次初始化生成新 id 后与 session 恢复标签重复。
      fullItem.id = item.id ?? (options.pinned ? DEFAULT_HOME_TAB_ID : createId())
      if (options.closable !== undefined) fullItem.closable = options.closable
      const tabId = fullItem.id
      const uri = parseUrl(fullItem.path)
      const cacheName = createPageId()
      const page: ITabPage = {
        id: cacheName,
        tabId,
        path: normalizePathname(uri.path),
        query: defu(omitStackTabsReservedQuery(uri.query), { __tab: encodeTabInfo(fullItem) })
      }
      const pages = new Stack<ITabPage>()
      pages.push(page)
      const tab: ITabItem = {
        id: tabId,
        title: fullItem.title ?? '',
        closable: fullItem.closable!,
        refreshable: fullItem.refreshable!,
        iframe: fullItem.iframe!,
        iframeRefreshMode:
          (fullItem as { iframeRefreshMode?: string }).iframeRefreshMode === 'reload'
            ? 'reload'
            : 'postMessage',
        active: false,
        pages,
        pinned: options.pinned
      }

      addCache(cacheName)
      return tab
    }

    if (homeTab) {
      const home = buildTab(homeTab, { pinned: true, closable: false })
      homeTabId = home.id
      newDefaults.push(home)
      newTabs.push({ ...home })
    }

    for (const item of staticTabs) {
      // home 已单独创建；相同 id 的配置跳过，避免出现两个固定首页。
      if (homeTabId && item.id === homeTabId) {
        if (!import.meta.env.PROD) {
          console.warn(
            '[vue-stack-tabs] defaultTabs contains the same id as homeTab; skipped:',
            item.id
          )
        }
        continue
      }
      const tab = buildTab(item)
      newDefaults.push(tab)
      newTabs.push({ ...tab })
    }

    defaultTabs.value = [...defaultTabs.value, ...newDefaults]
    addTabs(newTabs)

    // SSR 环境无 sessionStorage，直接跳过恢复。
    const storedTabJson =
      typeof window !== 'undefined' ? sessionStorage.getItem(getSessionKey()) : null
    const restoredTab = restoreTabFromSession(storedTabJson)
    if (restoredTab && !hasTab(restoredTab.id)) {
      if (restoredTab.url) restoredTab.url = toSafeTabUrl(restoredTab.url)
      if (restoredTab.iframe && restoredTab.url && restoredTab.iframeRefreshMode === undefined) {
        restoredTab.iframeRefreshMode = isCrossOriginUrl(restoredTab.url) ? 'reload' : 'postMessage'
      }

      if (restoredTab.pages && typeof restoredTab.pages.list === 'function') {
        addTab(restoredTab)
        for (const page of getPages(restoredTab.id)) {
          if (page && page.id) addCache(page.id)
        }
      } else {
        addTab(restoredTab)
      }
    }
    isInitialized.value = true
  }

  const { resolvePageComponent } = createPageComponentFactory({
    runtimeContext,
    consumeBackParams,
    getComponent,
    setComponent,
    addCache,
    evictMarkedCaches,
    clearTabEvictionMarks,
    addPageScroller,
    saveScroller,
    restoreScroller,
    removeScroller
  })

  /** 把已有标签的对外字段提取为 ITabBase（用于让路由归属回该标签） */
  const toTabBase = (tab: ITabItem): ITabBase => ({
    id: tab.id,
    title: tab.title,
    closable: tab.closable,
    refreshable: tab.refreshable,
    iframe: tab.iframe,
    iframeRefreshMode: tab.iframeRefreshMode
  })

  /**
   * 动态更新标签标题。
   *
   * 同步 TabRecord、对外视图与 session；激活标签还会把新的 __tab 写回当前 URL，
   * 避免刷新或分享链接后标题回退。
   */
  const updateTabTitle = (tabId: string, title: string): boolean => {
    if (!updateTabTitleInStore(tabId, title)) return false
    const tab = getTab(tabId)
    if (!tab) return false

    if (tab.active) {
      saveActiveTabToSession(tab)
      const top = getTopPage(tabId)
      if (top) {
        void Promise.resolve(
          router.replace({
            path: top.path,
            query: { ...cloneLocationQuery(top.query), __tab: encodeTabInfo(toTabBase(tab)) },
            hash: router.currentRoute.value.hash
          })
        ).catch((error: unknown) => {
          if (!import.meta.env.PROD) {
            console.warn('[vue-stack-tabs] Failed to sync tab title to URL:', error)
          }
        })
      }
    }
    return true
  }

  /** 当前固定首页（homeTab）；未配置时返回 null。 */
  const getHomeTab = (): ITabItem | null => getTabs().find((tab) => tab.pinned) ?? null

  /**
   * 无 __tab 且当前路径没有归属标签时，导航到 homeTab 的栈顶页面。
   * 使用 replace，避免在浏览器历史里留下中间状态。
   */
  const redirectToHome = (): boolean => {
    const home = getHomeTab()
    const top = home ? getTopPage(home.id) : null
    if (!home || !top) return false

    const query = {
      ...cloneLocationQuery(top.query),
      __tab: encodeTabInfo(toTabBase(home))
    }
    void Promise.resolve(
      router.replace({
        path: top.path,
        query,
        hash: ''
      })
    ).catch((error: unknown) => {
      if (!import.meta.env.PROD) {
        console.warn('[vue-stack-tabs] Failed to redirect to home tab:', error)
      }
    })
    return true
  }

  /**
   * 是否应回落到 homeTab：仅限 URL 没有 __tab，且当前路径没有被任何标签的栈顶承载。
   * 带 __tab 的地址即使页面不存在也不回落，交给应用自己的 404 路由处理。
   */
  const shouldRedirectToHome = (route: RouteLocationNormalizedLoaded): boolean => {
    if (typeof route.query.__tab === 'string') return false

    const path = normalizePathForCache(route)
    const activeTab = getActiveTab()
    if (activeTab && getTopPage(activeTab.id)?.path === path) return false
    if (findTabByTopPagePath(path)) return false

    const home = getHomeTab()
    return Boolean(home && getTopPage(home.id))
  }

  /**
   * 从路由解析 tabInfo，若无则创建默认信息，调用方负责把编码信息写入内部 page.query。
   *
   * 首次进入应用时 URL 上通常还没有 __tab：此时优先接管 path 匹配的默认标签（defaultTabs），
   * 由调用方把 __tab 写回地址，保证「URL 指向默认标签」；确实找不到归属且配置了 homeTab 时
   * 返回 null，由调用方重定向到首页；未配置 homeTab 时保持原有兜底标签行为。
   */
  const parseTabInfoFromRoute = (route: RouteLocationNormalizedLoaded): ITabBase | null => {
    const encodedTab = route.query.__tab
    const hasEncodedTab = typeof encodedTab === 'string'
    if (hasEncodedTab) {
      const tabInfo = decodeTabInfo(encodedTab)
      if (tabInfo.id) return tabInfo
    }

    const path = normalizePathForCache(route)
    const activeTab = getActiveTab()
    const activePage = activeTab ? getTopPage(activeTab.id) : null
    if (activeTab && activePage?.path === path) {
      return toTabBase(activeTab)
    }

    // 当前激活标签与路由不一致：首屏 URL 无 __tab，或 session 恢复了上次激活的其它标签
    //（演示应用在 iframe 中重载后 hash 为空即属此类）。此时接管栈顶 path 与当前路由一致的
    // 标签（默认标签或已有标签），避免同一个页面既留下已有标签、又生成一个「未命名」的兜底标签。
    const pathMatchedTab = findTabByTopPagePath(path)
    if (pathMatchedTab) return toTabBase(pathMatchedTab)

    // 无 __tab 且无任何标签承载当前路径：配置了 homeTab 时交给调用方重定向。
    // 注意：__tab 存在但无效时仍保持原行为（新建兜底标签），不把错误地址变成首页。
    if (!hasEncodedTab && getHomeTab()) return null

    return {
      id: createId(),
      title: t('VueStackTab.undefined'),
      closable: true,
      refreshable: true,
      iframe: false
    }
  }

  /**
   * 查找或创建目标标签，并同步更新 active 状态与 pages 栈。
   */
  const findOrCreateTargetTab = (
    tabInfo: ITabBase,
    route: RouteLocationNormalizedLoaded,
    cacheName: string,
    page: ITabPage
  ): ITabItem => {
    let targetTab = tabInfo.id ? getTab(tabInfo.id) : null

    if (targetTab === null) {
      const pages = new Stack<ITabPage>()
      pages.push(page)
      const src = route.query.__src
      targetTab = {
        id: tabInfo.id!,
        title: tabInfo.title,
        closable: tabInfo.closable!,
        refreshable: tabInfo.refreshable!,
        iframe: tabInfo.iframe!,
        iframeRefreshMode: tabInfo.iframeRefreshMode ?? 'postMessage',
        url: decodeSafeTabUrl(src),
        active: true,
        pages
      }
      activateTab('')
      addTab(targetTab)
      emitter.emit(TabEventType.TAB_ACTIVE, { id: tabInfo.id!, isRoute: false })
    } else {
      activateTab(targetTab.id)
      const topPage = getTopPage(targetTab.id)
      if (!topPage || topPage.id !== page.id) {
        appendPage(targetTab.id, page)
      }
    }
    return targetTab
  }

  const createCacheName = () => {
    return createPageId()
  }

  /**
   * 根据当前路由更新/创建标签与页面状态（核心路由适配器）。
   */
  const updatePageState = (
    route: RouteLocationNormalizedLoaded
  ):
    | { cacheName: string; tabInfo: ITabBase; targetTab: ITabItem }
    | { empty: true }
    | { recovered: DefineComponent; cacheName: string } => {
    const resolvedTabInfo = parseTabInfoFromRoute(route)
    if (resolvedTabInfo === null) {
      // 无 __tab 且没有标签承载当前路径：回落到 homeTab。
      redirectToHome()
      return { empty: true }
    }
    const tabInfo = resolvedTabInfo
    if (isTabMarkedForEviction(tabInfo.id!)) return { empty: true }

    const path = normalizePathForCache(route)
    const routeQuery = cloneRouteQuery(route, tabInfo)
    /** path 与业务 query 都一致才算同一个页面（忽略 __tab 等保留参数） */
    const isSameLocation = (candidate: ITabPage): boolean =>
      candidate.path === path && isSameQueryIgnoringReserved(routeQuery, candidate.query || {})

    let targetTab: ITabItem | null = tabInfo.id ? (getTab(tabInfo.id) as ITabItem | null) : null
    let cacheName: string
    let page: ITabPage | null = null

    if (targetTab && getTopPage(targetTab.id)) {
      const top = getTopPage(targetTab.id)!
      if (!top) throw new Error('[vue-stack-tabs] Stack is not empty but peek() returned undefined')

      if (isSameLocation(top)) {
        cacheName = top.id
      } else if (top.path === path) {
        // 同 path、不同 query：按产品语义作为新页面入栈，backward 才能按 query 精确回退。
        cacheName = createPageId()
        page = {
          id: cacheName,
          tabId: tabInfo.id!,
          path,
          query: cloneLocationQuery(routeQuery)
        }
      } else {
        const pagesList = getPages(targetTab.id)
        let foundIndex = -1
        for (let i = pagesList.length - 2; i >= 0; i--) {
          const pastPage = pagesList[i]
          if (pastPage && isSameLocation(pastPage)) {
            foundIndex = i
            break
          }
        }

        if (foundIndex !== -1) {
          if (!import.meta.env.PROD) {
            console.warn(
              '[vue-stack-tabs] Detected native browser back navigation, repairing page stack...'
            )
          }
          const stepsToPop = pagesList.length - 1 - foundIndex
          const poppedPages = popPages(targetTab.id, stepsToPop)
          // 仅标记待驱逐，由 onActivated 或下一拍 evictMarkedCaches 统一清理，
          // 避免 watcher 同步执行与守卫拒绝路由之间产生不一致。
          for (const popped of poppedPages) markCacheForEviction(popped.id)
          const newTop = getTopPage(targetTab.id)
          cacheName = newTop ? newTop.id : createPageId()

          if (!newTop) {
            page = {
              id: cacheName,
              tabId: tabInfo.id!,
              path,
              query: cloneLocationQuery(routeQuery)
            }
          }
        } else {
          cacheName = createPageId()
          page = {
            id: cacheName,
            tabId: tabInfo.id!,
            path,
            query: cloneLocationQuery(routeQuery)
          }
        }
      }
    } else {
      cacheName = createPageId()
      page = {
        id: cacheName,
        tabId: tabInfo.id!,
        path,
        query: cloneLocationQuery(routeQuery)
      }
    }

    if (isCacheMarkedForEviction(cacheName)) {
      unmarkCacheForEviction(cacheName)
      const cached = getComponent(cacheName)
      if (cached) return { recovered: cached, cacheName }
    }

    if (page) {
      targetTab = findOrCreateTargetTab(tabInfo, route, cacheName, page)
    } else {
      activateTab(targetTab!.id)
    }

    // 首屏 URL 往往没有 __tab（用户直接打开默认路由）：把解析出的标签编码写回地址，
    // 保证 URL 始终指向当前标签；之后的导航各自会带上自己的 __tab。
    if (typeof route.query.__tab !== 'string') {
      void router.replace({
        path: route.path,
        query: { ...cloneLocationQuery(route.query), __tab: encodeTabInfo(tabInfo) },
        hash: route.hash
      })
    }

    saveActiveTabToSession(targetTab!)
    return { cacheName, tabInfo, targetTab: targetTab! }
  }

  /** 当前正在渲染的页面的缓存 Key（ULID），供 StackTabs.vue 的 :key 绑定使用 */
  const activeCacheKey = ref<string>('')
  /** 只随当前活动页面刷新变化，避免一个 Tab 刷新导致其他 Tab 的缓存 key 失效。 */
  const activePageRefreshVersion = computed(() => {
    const activeTab = getActiveTab()
    return activeTab ? (getTopPage(activeTab.id)?.refreshVersion ?? 0) : 0
  })

  let lastRouteKey = ''
  let lastAddPageResult: DefineComponent | null = null

  const addPage = (
    route: RouteLocationNormalizedLoaded,
    component?: VNode | null
  ): DefineComponent => {
    if (!component) {
      // 路由没有匹配到组件时不会进入 updatePageState；仍需处理无 __tab 的未知地址回落到首页。
      // 带 __tab 的未知页面不做重定向，交给应用自己的 404 路由（或空占位）处理。
      if (shouldRedirectToHome(route)) redirectToHome()
      return getEmptyPlaceholderComponent()
    }

    const routeKey = route.fullPath + (route.query.__tab || '')
    if (routeKey === lastRouteKey && lastAddPageResult) {
      return lastAddPageResult
    }

    const state = updatePageState(route)
    if ('empty' in state) return getEmptyPlaceholderComponent()
    if ('recovered' in state) {
      addCache(state.cacheName)
      activeCacheKey.value = state.cacheName
      lastRouteKey = routeKey
      lastAddPageResult = state.recovered
      return state.recovered
    }
    activeCacheKey.value = state.cacheName
    const result = resolvePageComponent(state)
    lastRouteKey = routeKey
    lastAddPageResult = result
    return result
  }

  const renewTab = (tab: ITabData) => {
    const currentTab = getTab(tab.id!)
    if (!currentTab) return undefined

    const pageSnapshot = getPageSnapshot(currentTab.id)
    const cacheSnapshot = snapshotCaches()
    const componentSnapshot = snapshotComponents()

    markTabPagesForEvictionOnly(currentTab)
    evictMarkedCaches()
    clearPages(currentTab.id)

    return () => {
      replacePages(currentTab.id, pageSnapshot)
      restoreCaches(cacheSnapshot)
      restoreComponents(componentSnapshot)
    }
  }

  const removeTab = (id: string): string => {
    const result = removeTabFromStore(id)
    if (result.status === 'not-found') return ''
    if (result.status === 'not-closable') return id

    if (result.nextActiveId) {
      emitter.emit(TabEventType.TAB_ACTIVE, { id: result.nextActiveId })
    }

    return result.nextActiveId
  }

  /** 批量关闭满足条件的可关闭标签，并统一标记其页面缓存待驱逐。 */
  const removeTabs = (shouldRemove: (tab: ITabItem, index: number) => boolean) =>
    removeTabsFromStore(shouldRemove)

  const removeAllTabs = () => {
    removeTabs(() => true)
    if (getActiveTab()) {
      evictMarkedCaches()
      clearTabEvictionMarks()
      return
    }
    const last = getTabs().at(-1)
    if (last) emitter.emit(TabEventType.TAB_ACTIVE, { id: last.id })
  }

  const removeOtherTabs = (id: string) => {
    const activeTab = getTab(id)
    removeTabs((tab) => tab.id !== id)
    if (activeTab && !activeTab.active) {
      emitter.emit(TabEventType.TAB_ACTIVE, { id })
    } else {
      evictMarkedCaches()
      clearTabEvictionMarks()
    }
  }

  const removeLeftTabs = (id: string) => {
    const pivot = getTabs().findIndex((t) => t?.id === id)
    if (pivot <= 0) return

    removeTabs((_, index) => index < pivot)
    if (getActiveTab()) {
      evictMarkedCaches()
      clearTabEvictionMarks()
      return
    }
    const first = getTabs()[0]
    if (first) emitter.emit(TabEventType.TAB_ACTIVE, { id: first.id })
  }

  const removeRightTabs = (id: string) => {
    const tabList = getTabs()
    const pivot = tabList.findIndex((t) => t?.id === id)
    if (pivot < 0 || pivot >= tabList.length - 1) return

    removeTabs((_, index) => index > pivot)
    if (getActiveTab()) {
      evictMarkedCaches()
      clearTabEvictionMarks()
      return
    }
    const last = getTabs().at(-1)
    if (last) emitter.emit(TabEventType.TAB_ACTIVE, { id: last.id })
  }

  const { refreshTab, refreshAllTabs } = createTabPanelRefresh({
    getTabs,
    getTopPage,
    updatePage,
    updatePages,
    iframeRefreshKeys,
    createPageId,
    addCache,
    evictPageCache,
    replacePageCaches,
    refreshIframeByPostMessage: (id) => emitter.emit(TabEventType.REFRESH_IFRAME_POSTMESSAGE, id)
  })

  /**
   * 激活指定标签，更新 active 状态并可选跳转路由
   * @param id - 标签 id
   * @param route - 是否执行 router.push
   */
  const active = (id: string, route = true) => {
    emitter.emit(TabEventType.FORWARD)
    const target = getTab(id)
    if (!target) return Promise.resolve()
    if (target.active) {
      // 已是激活标签时仍需通知标签栏确保其可见（用户可能已把标签栏滚开）。
      emitter.emit(TabEventType.TAB_SCROLL_TO, { id })
      return Promise.resolve()
    }

    const top = getTopPage(id)
    const activateTarget = () => {
      const activeTab = activateTab(id)
      if (activeTab) saveActiveTabToSession(activeTab)
    }

    if (!route) {
      activateTarget()
      return Promise.resolve()
    }
    if (!top) {
      activateTarget()
      return Promise.resolve()
    }

    const __tab = encodeTabInfo({
      id: target.id,
      title: target.title,
      closable: target.closable,
      refreshable: target.refreshable,
      iframe: target.iframe
    })
    // __tab 是兜底标识，目标栈顶已带 __tab 时优先沿用，否则用我们刚编码的版本。
    const query = defu(top.query || {}, { __tab })

    return runNavigationTransaction({
      apply: () => {
        const prevActiveId = getActiveTab()?.id
        // SSR 环境无 sessionStorage；快照为 null 时 rollback 视为「无变化」。
        const sessionSnapshot =
          typeof window !== 'undefined' ? window.sessionStorage.getItem(getSessionKey()) : null
        activateTarget()
        return { prevActiveId, sessionSnapshot }
      },
      navigate: () => router.push({ path: top.path, query }),
      rollback: (snapshot) => {
        activateTab(snapshot.prevActiveId ?? '')
        restoreActiveTabSession(snapshot.sessionSnapshot)
      },
      isFailureResult: isNavigationFailure,
      rejectFailureResult: true
    })
  }

  const reset = () => removeAllTabs()

  const destroy = () => {
    resetStore()
    defaultTabs.value = []
    iframeRefreshKeys.value = {}
    runtimeContext.scrollPositionsByPageId.clear()
    runtimeContext.isInitialized.value = false
    runtimeContext.refreshKey.value = 0
    clearSession()
  }

  return {
    tabs,
    caches,
    refreshKey,
    activeCacheKey,
    activePageRefreshVersion,
    isInitialized,
    setMaxSize: (value: number) => {
      runtimeContext.maxTabCount.value = value
    },
    canAddTab,
    initialize,
    size,
    active,
    updateTabTitle,
    getCacheName: createCacheName,
    destroy,
    reset,
    addCache,
    removeCache,
    getTab,
    getActiveTab,
    getTopPage,
    getPages,
    getPageRefreshVersion,
    getPageSnapshot,
    moveTab,
    addTab,
    appendPage,
    popPages,
    replacePages,
    clearPages,
    updatePage,
    updatePages,
    removeTab,
    removeAllTabs,
    removeLeftTabs,
    removeRightTabs,
    removeOtherTabs,
    hasTab,
    renewTab,
    addPage,
    addComponent: setComponent,
    getComponent,
    removeComponent: deleteComponent,
    markCacheForEviction,
    evictMarkedCaches,
    evictPageCache,
    clearTabEvictionMarks,
    refreshTab,
    refreshAllTabs,
    iframeRefreshKeys,
    addPageScroller,
    setGlobalScroll: (value: boolean) => {
      runtimeContext.useGlobalScroll.value = value
    },
    clearSession,
    setSessionPrefix: (value: string) => {
      runtimeContext.sessionPrefix.value = value
    }
  }
}

type TabPanelApi = ReturnType<typeof createTabPanelApi>

const panelApiByContext = new WeakMap<StackTabsRuntimeContext, TabPanelApi>()

/**
 * 同一个运行时上下文复用同一套 panel API。
 *
 * StackTabs、StackKeepAlive、StackCacheRenderer、ContextMenu 与页面内的 useTabRouter
 * 都会调用本 hook；首次调用在 setup 上下文中完成 useRouter/useI18n 注入，
 * 后续调用直接返回缓存，避免重复创建 scroll/session/refresh 闭包与局部状态。
 */
export default (providedRuntimeContext?: StackTabsRuntimeContext): TabPanelApi => {
  const runtimeContext = providedRuntimeContext ?? resolveStackTabsRuntimeContext()
  const existing = panelApiByContext.get(runtimeContext)
  if (existing) return existing

  const panelApi = createTabPanelApi(runtimeContext)
  panelApiByContext.set(runtimeContext, panelApi)
  return panelApi
}
