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
import {
  defineComponent,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  computed,
  ref,
  shallowRef,
  cloneVNode
} from 'vue'
import type { DefineComponent, VNode } from 'vue'
import { isNavigationFailure, useRouter } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { encodeTabInfo, createPageId, decodeTabInfo } from '../utils/tabInfoEncoder'
import { defu } from 'defu'
import { Stack } from '../model/TabModel'
import {
  parseUrl,
  isCrossOriginUrl,
  omitStackTabsReservedQuery,
  toSafeTabUrl,
  decodeSafeTabUrl,
  cloneLocationQuery,
  clonePage
} from '../utils/urlParser'
import PageLoading from '../components/PageLoading.vue'
import { TabEventType, useTabEmitter } from './useTabEventBus'
import { runNavigationTransaction } from './tabPanel/navigationTransaction'
import { useI18n } from 'vue-i18n-lite'

import { resolveStackTabsRuntimeContext } from './stackTabsContext'
import { createTabPanelEviction } from './tabPanel/evict'
import { createTabPanelScroll } from './tabPanel/scroll'
import { createTabPanelSession } from './tabPanel/session'

/* eslint-disable vue/one-component-per-file */
/** 占位组件：当路由组件为空或标签已被标记删除时返回 */
const EmptyPlaceholderComponent = defineComponent({
  name: 'StackTabEmptyPlaceholder',
  setup() {
    return () => null
  }
})

const cloneRouteQuery = (route: RouteLocationNormalizedLoaded, tabInfo: ITabBase) => ({
  ...cloneLocationQuery(route.query),
  __tab: route.query.__tab ?? encodeTabInfo(tabInfo)
})

/** 规范化路径（nginx 等可能加尾部斜杠） */
export const normalizePathForCache = (route: RouteLocationNormalizedLoaded): string => {
  const lastMatch = route.matched[route.matched.length - 1]
  const matchPath = lastMatch?.path ?? route.path
  const path = route.path.endsWith('/') ? route.path.slice(0, -1) : route.path
  return matchPath === path ? path : route.path
}

export default () => {
  const router = useRouter()
  const emitter = useTabEmitter()
  const { t } = useI18n()
  const runtimeContext = resolveStackTabsRuntimeContext()
  const {
    tabs,
    defaultTabs,
    caches,
    components,
    tabIdsToEvict,
    refreshKey,
    iframeRefreshKeys,
    isInitialized,
    cacheIdsToEvict
  } = runtimeContext
  const {
    markCacheForEviction,
    markTabPagesForEviction,
    markTabPagesForEvictionOnly,
    addCache,
    removeCache,
    evictMarkedCaches,
    evictPageCache
  } = createTabPanelEviction(runtimeContext)
  const { restoreScroller, saveScroller, removeScroller, addPageScroller } =
    createTabPanelScroll(runtimeContext)
  const {
    saveActiveTabToSession,
    clearSession,
    restoreTabFromSession,
    restoreActiveTabSession,
    getSessionKey
  } = createTabPanelSession(runtimeContext)

  const size = (): number => tabs.value.length

  /**
   * 初始化：根据 defaultTabs 创建标签与初始页面，并尝试从 sessionStorage 恢复上次激活的标签
   * @param staticTabs - 初始标签配置
   */
  const initialize = (staticTabs: ITabData[]) => {
    const newDefaults: ITabItem[] = []
    const newTabs: ITabItem[] = []

    for (const item of staticTabs) {
      const fullItem = defu(item, {
        id: crypto.randomUUID(),
        refreshable: true,
        closable: true,
        iframe: false
      })
      const tabId = fullItem.id ?? crypto.randomUUID()
      fullItem.id = tabId
      const uri = parseUrl(fullItem.path)
      const cacheName = createPageId()
      const page: ITabPage = {
        id: cacheName,
        tabId,
        path: uri.path,
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
        pages
      }

      addCache(cacheName)
      newDefaults.push(tab)
      newTabs.push({ ...tab })
    }

    defaultTabs.value = [...defaultTabs.value, ...newDefaults]
    tabs.value = [...tabs.value, ...newTabs]

    const storedTabJson = sessionStorage.getItem(getSessionKey())
    const restoredTab = restoreTabFromSession(storedTabJson)
    if (restoredTab && !tabs.value.some((t) => t.id === restoredTab.id)) {
      if (restoredTab.url) restoredTab.url = toSafeTabUrl(restoredTab.url)
      if (restoredTab.iframe && restoredTab.url && restoredTab.iframeRefreshMode === undefined) {
        restoredTab.iframeRefreshMode = isCrossOriginUrl(restoredTab.url) ? 'reload' : 'postMessage'
      }

      if (restoredTab.pages && typeof restoredTab.pages.list === 'function') {
        const pages = restoredTab.pages.list()
        pages.forEach((page) => {
          if (page && page.id) addCache(page.id)
        })
      }

      tabs.value = [...tabs.value, restoredTab]
    }
    isInitialized.value = true
  }

  const hasTab = (id: string) => tabs.value.some((t) => t.id === id)
  const canAddTab = () =>
    runtimeContext.maxTabCount.value <= 0 ||
    (runtimeContext.maxTabCount.value > 0 && runtimeContext.maxTabCount.value > tabs.value.length)

  const addTab = (tab: ITabItem): void => {
    tabs.value = [...tabs.value, tab]
  }

  const getTab = (id: string) => tabs.value.find((t) => t.id === id) ?? null

  /** 从路由解析 tabInfo，若无则创建默认信息，调用方负责把编码信息写入内部 page.query */
  const parseTabInfoFromRoute = (route: RouteLocationNormalizedLoaded): ITabBase => {
    if (route.query.__tab) return decodeTabInfo(route.query.__tab as string)

    const path = normalizePathForCache(route)
    const activeTab = tabs.value.find((tab) => tab.active)
    const activePage = activeTab?.pages.peek()
    if (activeTab && activePage?.path === path) {
      return {
        id: activeTab.id,
        title: activeTab.title,
        closable: activeTab.closable,
        refreshable: activeTab.refreshable,
        iframe: activeTab.iframe,
        iframeRefreshMode: activeTab.iframeRefreshMode
      }
    }

    return {
      id: crypto.randomUUID(),
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
    let targetTab: ITabItem | null = null
    for (const tab of tabs.value) {
      tab.active = false
      if (tab.id === tabInfo.id) targetTab = tab as ITabItem
    }

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
      } as unknown as ITabItem
      addTab(targetTab)
      emitter.emit(TabEventType.TAB_ACTIVE, { id: tabInfo.id!, isRoute: false })
    } else {
      targetTab.active = true
      if (targetTab.pages.isEmpty() || targetTab.pages.peek()!.id !== page.id) {
        targetTab.pages.push(page)
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
    const tabInfo = parseTabInfoFromRoute(route)
    if (tabIdsToEvict.has(tabInfo.id!)) return { empty: true }

    const path = normalizePathForCache(route)

    let targetTab: ITabItem | null = tabInfo.id ? (getTab(tabInfo.id) as ITabItem | null) : null
    let cacheName: string
    let page: ITabPage | null = null

    if (targetTab && !targetTab.pages.isEmpty()) {
      const top = targetTab.pages.peek()
      if (!top) throw new Error('[vue-stack-tabs] Stack is not empty but peek() returned undefined')

      if (top.path === path) {
        cacheName = top.id
      } else {
        const pagesList = targetTab.pages.readonlyList()
        let foundIndex = -1
        for (let i = pagesList.length - 2; i >= 0; i--) {
          const pastPage = pagesList[i]
          if (pastPage && pastPage.path === path) {
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
          for (let i = 0; i < stepsToPop; i++) {
            const popped = targetTab.pages.pop()
            if (popped) evictPageCache(popped.id)
          }
          const newTop = targetTab.pages.peek()
          cacheName = newTop ? newTop.id : createPageId()

          if (!newTop) {
            page = {
              id: cacheName,
              tabId: tabInfo.id!,
              path: route.path,
              query: cloneRouteQuery(route, tabInfo)
            }
          }
        } else {
          cacheName = createPageId()
          page = {
            id: cacheName,
            tabId: tabInfo.id!,
            path: route.path,
            query: cloneRouteQuery(route, tabInfo)
          }
        }
      }
    } else {
      cacheName = createPageId()
      page = {
        id: cacheName,
        tabId: tabInfo.id!,
        path: route.path,
        query: cloneRouteQuery(route, tabInfo)
      }
    }

    if (cacheIdsToEvict.has(cacheName)) {
      cacheIdsToEvict.delete(cacheName)
      const cached = components.get(cacheName)
      if (cached) return { recovered: cached, cacheName }
    }

    if (page) {
      targetTab = findOrCreateTargetTab(tabInfo, route, cacheName, page)
    } else {
      for (const t of tabs.value) t.active = false
      targetTab!.active = true
    }

    saveActiveTabToSession(targetTab!)
    return { cacheName, tabInfo, targetTab: targetTab! }
  }

  /**
   * 获取或创建与 cacheName 对应的 cacheComponent（keep-alive 包装组件）。
   */
  const resolvePageComponent = (ctx: {
    cacheName: string
    tabInfo: ITabBase
    targetTab: ITabItem
  }): DefineComponent => {
    const { cacheName, tabInfo } = ctx

    if (components.has(cacheName)) {
      addCache(cacheName)
      return components.get(cacheName)!
    }

    const cacheComponent = defineComponent({
      name: cacheName,
      props: {
        vnode: {
          type: Object as () => VNode,
          required: false,
          default: undefined
        }
      },
      emits: ['onLoaded'],
      setup(props, context) {
        const localBackParams = ref<Record<string, unknown> | null>(null)
        const lastVnode = shallowRef<VNode | null>(null)
        const lastCloned = shallowRef<VNode | null>(null)
        const lastBackParams = shallowRef<Record<string, unknown> | null>(null)

        const checkAndConsumeBackParams = () => {
          try {
            const tab = getTab(tabInfo.id!)
            const top = tab?.pages.peek()
            if (top && top.id === cacheName && top._backParams) {
              localBackParams.value = { ...top._backParams }
              delete top._backParams
            } else {
              localBackParams.value = null
            }
          } catch {
            localBackParams.value = null
          }
        }

        onMounted(() => {
          context.emit('onLoaded')
          addPageScroller(cacheName, `#W-${cacheName}`)
          checkAndConsumeBackParams()
        })

        onDeactivated(() => saveScroller(cacheName))

        onActivated(() => {
          context.emit('onLoaded')
          restoreScroller(cacheName)
          evictMarkedCaches()
          tabIdsToEvict.clear()
          checkAndConsumeBackParams()
        })

        onUnmounted(() => removeScroller(cacheName))

        return () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Node = (props as any).vnode as VNode
          const backParams = localBackParams.value

          if (Node !== lastVnode.value || backParams !== lastBackParams.value) {
            const dynamicBackProps = backParams ? { _back: backParams } : {}
            lastCloned.value = Node
              ? cloneVNode(Node, { tId: tabInfo.id, pId: cacheName, ...dynamicBackProps })
              : null
            lastVnode.value = Node
            lastBackParams.value = backParams
          }

          return (
            <div
              class="cache-page-wrapper"
              id={`W-${cacheName}`}
              style={[
                runtimeContext.useGlobalScroll.value ? 'overflow:auto' : 'overflow:hidden',
                'height: 100%'
              ]}
            >
              {lastCloned.value}
              <PageLoading tabId={tabInfo.id!} />
            </div>
          )
        }
      }
    }) as DefineComponent
    components.set(cacheName, cacheComponent)
    addCache(cacheName)
    return cacheComponent
  }

  /** 当前正在渲染的页面的缓存 Key（ULID），供 StackTabs.vue 的 :key 绑定使用 */
  const activeCacheKey = ref<string>('')
  /** 只随当前活动页面刷新变化，避免一个 Tab 刷新导致其他 Tab 的缓存 key 失效。 */
  const activePageRefreshVersion = computed(() => {
    const activeTab = tabs.value.find((tab) => tab.active)
    return activeTab?.pages.peek()?.refreshVersion ?? 0
  })

  let lastRouteKey = ''
  let lastAddPageResult: DefineComponent | null = null

  const addPage = (
    route: RouteLocationNormalizedLoaded,
    component?: VNode | null
  ): DefineComponent => {
    if (!component) return EmptyPlaceholderComponent as DefineComponent

    const routeKey = route.fullPath + (route.query.__tab || '')
    if (routeKey === lastRouteKey && lastAddPageResult) {
      return lastAddPageResult
    }

    const state = updatePageState(route)
    if ('empty' in state) return EmptyPlaceholderComponent as DefineComponent
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

    const pageSnapshot = currentTab.pages.list().map((p) => clonePage(p))
    const cacheSnapshot = [...caches.value]
    const componentSnapshot = new Map(components)

    markTabPagesForEvictionOnly(currentTab)
    evictMarkedCaches()
    currentTab.pages.clear()

    return () => {
      currentTab.pages.clear()
      for (const page of pageSnapshot) currentTab.pages.push(clonePage(page))
      caches.value = [...cacheSnapshot]
      components.clear()
      for (const [id, component] of componentSnapshot) components.set(id, component)
    }
  }

  const removeTab = (id: string): string => {
    let activeTabId = ''
    const currentTab = getTab(id)
    const tabList = tabs.value
    const i = tabList.findIndex((t) => t?.id === id)
    if (i < 0) return ''

    const tab = tabList[i]!
    if (!tab.closable) return id

    markTabPagesForEviction(tab)
    tab.pages.clear()
    if (tabList.length > 1 && tab.active) {
      activeTabId = (i === 0 ? tabList[1] : tabList[i - 1])?.id ?? ''
    }
    tabList.splice(i, 1)

    if (activeTabId) {
      emitter.emit(TabEventType.TAB_ACTIVE, { id: activeTabId })
    }
    if (!currentTab?.active) {
      evictMarkedCaches()
      tabIdsToEvict.clear()
    }

    return activeTabId
  }

  const removeAllTabs = () => {
    const tabList = tabs.value
    for (let i = tabList.length - 1; i >= 0; i--) {
      const tab = tabList[i]
      if (tab?.closable) {
        markTabPagesForEviction(tab)
        tab.pages.clear()
        tabList.splice(i, 1)
      }
    }
    const hasActive = tabList.some((t) => t.active)
    if (hasActive) {
      evictMarkedCaches()
      tabIdsToEvict.clear()
      return
    }
    const last = tabList[tabList.length - 1]
    if (last) emitter.emit(TabEventType.TAB_ACTIVE, { id: last.id })
  }

  const removeOtherTabs = (id: string) => {
    const tabList = tabs.value
    let activeTab: ITabItem | undefined
    for (let i = tabList.length - 1; i >= 0; i--) {
      const tab = tabList[i]
      if (!tab) continue
      if (tab.id === id) {
        activeTab = tab as ITabItem
      } else if (tab.closable) {
        markTabPagesForEviction(tab)
        tab.pages.clear()
        tabList.splice(i, 1)
      }
    }
    if (activeTab && !activeTab.active) {
      emitter.emit(TabEventType.TAB_ACTIVE, { id })
    } else {
      evictMarkedCaches()
      tabIdsToEvict.clear()
    }
  }

  const removeLeftTabs = (id: string) => {
    const tabList = tabs.value
    const pivot = tabList.findIndex((t) => t?.id === id)
    if (pivot <= 0) return

    for (let i = pivot - 1; i >= 0; i--) {
      const tab = tabList[i]
      if (tab?.closable) {
        markTabPagesForEviction(tab)
        tab.pages.clear()
        tabList.splice(i, 1)
      }
    }
    if (tabList.some((t) => t.active)) {
      evictMarkedCaches()
      tabIdsToEvict.clear()
      return
    }
    const first = tabList[0]
    if (first) emitter.emit(TabEventType.TAB_ACTIVE, { id: first.id })
  }

  const removeRightTabs = (id: string) => {
    const tabList = tabs.value
    const pivot = tabList.findIndex((t) => t?.id === id)
    if (pivot < 0 || pivot >= tabList.length - 1) return

    for (let i = tabList.length - 1; i > pivot; i--) {
      const tab = tabList[i]
      if (tab?.closable) {
        markTabPagesForEviction(tab)
        tab.pages.clear()
        tabList.splice(i, 1)
      }
    }
    if (tabList.some((t) => t.active)) {
      evictMarkedCaches()
      tabIdsToEvict.clear()
      return
    }
    const last = tabList[tabList.length - 1]
    if (last) emitter.emit(TabEventType.TAB_ACTIVE, { id: last.id })
  }

  const refreshTab = (id: string) => {
    const tab = getTab(id)
    if (!tab?.refreshable) return

    if (tab.iframe) {
      if (tab.iframeRefreshMode === 'reload') {
        iframeRefreshKeys.value = {
          ...iframeRefreshKeys.value,
          [id]: (iframeRefreshKeys.value[id] ?? 0) + 1
        }
      } else {
        emitter.emit(TabEventType.REFRESH_IFRAME_POSTMESSAGE, id)
      }
      return
    }

    const currentPage = tab.pages.peek()
    if (!currentPage) return

    if (tab.active) {
      // 保持 cache id 稳定，只变更当前页面的 key，既保留动画也不影响其他 Tab 的缓存。
      currentPage.refreshVersion = (currentPage.refreshVersion ?? 0) + 1
      return
    }

    evictPageCache(currentPage.id)
    currentPage.id = createPageId()
    currentPage.refreshVersion = 0
    addCache(currentPage.id)
  }

  const refreshAllTabs = () => {
    const iframeKeysUpdate = { ...iframeRefreshKeys.value }
    let iframeKeysChanged = false

    for (const tab of tabs.value) {
      if (!tab?.refreshable) continue
      if (tab.iframe) {
        if (tab.iframeRefreshMode === 'reload') {
          iframeKeysUpdate[tab.id] = (iframeKeysUpdate[tab.id] ?? 0) + 1
          iframeKeysChanged = true
        } else {
          emitter.emit(TabEventType.REFRESH_IFRAME_POSTMESSAGE, tab.id)
        }
      } else {
        const currentPage = tab.pages.peek()
        if (currentPage) {
          if (tab.active) {
            currentPage.refreshVersion = (currentPage.refreshVersion ?? 0) + 1
          } else {
            evictPageCache(currentPage.id)
            currentPage.id = createPageId()
            currentPage.refreshVersion = 0
            addCache(currentPage.id)
          }
        }
      }
    }

    if (iframeKeysChanged) {
      iframeRefreshKeys.value = iframeKeysUpdate
    }
  }

  const getComponent = (id: string) => components.get(id)

  /**
   * 激活指定标签，更新 active 状态并可选跳转路由
   * @param id - 标签 id
   * @param route - 是否执行 router.push
   */
  const active = (id: string, route = true) => {
    emitter.emit(TabEventType.FORWARD)
    const target = getTab(id)
    if (!target) return Promise.resolve()
    if (target.active) return Promise.resolve()

    const top = target.pages.peek()
    const activateTarget = () => {
      for (const tab of tabs.value) {
        tab.active = tab.id === id
      }
      saveActiveTabToSession(target as ITabItem)
      tabs.value = tabs.value.slice()
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
    const query = defu({ __tab }, top.query || {})

    return runNavigationTransaction({
      apply: () => {
        const prevActiveId = tabs.value.find((tab) => tab.active)?.id
        const sessionSnapshot = window.sessionStorage.getItem(getSessionKey())
        activateTarget()
        return { prevActiveId, sessionSnapshot }
      },
      navigate: () => router.push({ path: top.path, query }),
      rollback: (snapshot) => {
        for (const tab of tabs.value) {
          tab.active = tab.id === snapshot.prevActiveId
        }
        tabs.value = tabs.value.slice()
        restoreActiveTabSession(snapshot.sessionSnapshot)
      },
      isFailureResult: isNavigationFailure,
      rejectFailureResult: true
    })
  }

  const reset = () => removeAllTabs()

  const destroy = () => {
    tabs.value = []
    defaultTabs.value = []
    cacheIdsToEvict.clear()
    tabIdsToEvict.clear()
    iframeRefreshKeys.value = {}
    caches.value = []
    components.clear()
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
    getCacheName: createCacheName,
    destroy,
    reset,
    addCache,
    removeCache,
    getTab,
    addTab,
    removeTab,
    removeAllTabs,
    removeLeftTabs,
    removeRightTabs,
    removeOtherTabs,
    hasTab,
    renewTab,
    addPage,
    addComponent: (id: string, comp: DefineComponent) => components.set(id, comp),
    getComponent,
    removeComponent: (id: string) => components.delete(id),
    markCacheForEviction,
    evictMarkedCaches,
    evictPageCache,
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
