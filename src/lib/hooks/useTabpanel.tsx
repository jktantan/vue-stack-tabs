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
import { defineComponent, onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import type { DefineComponent, VNode } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { ulid } from 'ulid'
import { encodeTabInfo, createPageId, decodeTabInfo } from '../utils/tabInfoEncoder'
import { defu } from 'defu'
import { Stack } from '../model/TabModel'
import { parseUrl, isCrossOriginUrl } from '../utils/urlParser'
import PageLoading from '../components/PageLoading.vue'
import { TabEventType, useTabEmitter } from './useTabEventBus'
import { useI18n } from 'vue-i18n-lite'

import {
  tabs,
  defaultTabs,
  caches,
  components,
  tabIdsToEvict,
  refreshKey,
  excludedCacheIdsForRefresh,
  iframeRefreshKeys,
  isInitialized,
  maxTabCount,
  useGlobalScroll,
  cacheIdsToEvict,
  setMaxTabCount,
  setUseGlobalScroll,
  setSessionPrefix
} from './tabPanel/state'
import {
  markCacheForEviction,
  markTabPagesForEviction,
  markTabPagesForEvictionOnly,
  addCache,
  removeCache,
  evictMarkedCaches
} from './tabPanel/evict'
import { restoreScroller, saveScroller, removeScroller, addPageScroller } from './tabPanel/scroll'
import {
  saveActiveTabToSession,
  clearSession,
  restoreTabFromSession,
  getSessionKey
} from './tabPanel/session'

/* eslint-disable vue/one-component-per-file */
/** 占位组件：当路由组件为空或标签已被标记删除时返回 */
const EmptyPlaceholderComponent = defineComponent({
  name: 'StackTabEmptyPlaceholder',
  setup() {
    return () => null
  }
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

  const size = (): number => tabs.value.length

  /**
   * 初始化：根据 defaultTabs 创建标签与初始页面，并尝试从 sessionStorage 恢复上次激活的标签
   * @param staticTabs - 初始标签配置
   */
  const initialize = (staticTabs: ITabData[]) => {
    for (const item of staticTabs) {
      const fullItem = defu(item, { id: ulid(), refreshable: true, closable: true, iframe: false })
      const tabId = fullItem.id ?? ulid()
      fullItem.id = tabId
      const uri = parseUrl(fullItem.path)
      const config = defu(fullItem, {
        closable: true,
        refreshable: true,
        iframe: false
      })
      const cacheName = createPageId(tabId, uri.path, uri.query)
      const page: ITabPage = {
        id: cacheName,
        tabId,
        path: uri.path,
        query: defu(uri.query, { __tab: encodeTabInfo(fullItem) })
      }
      const pages = new Stack<ITabPage>()
      pages.push(page)
      const tab: ITabItem = {
        id: tabId,
        title: config.title ?? '',
        closable: config.closable,
        refreshable: config.refreshable,
        iframe: config.iframe,
        iframeRefreshMode: (config as { iframeRefreshMode?: string }).iframeRefreshMode === 'reload' ? 'reload' : 'postMessage',
        active: false,
        pages
      }

      addCache(cacheName)
      defaultTabs.push(tab)
      tabs.value.push({ ...tab })
    }

    const storedTabJson = sessionStorage.getItem(getSessionKey())
    const restoredTab = restoreTabFromSession(storedTabJson)
    if (restoredTab && !tabs.value.some((t) => t.id === restoredTab!.id)) {
      if (restoredTab.iframe && restoredTab.url && restoredTab.iframeRefreshMode === undefined) {
        restoredTab.iframeRefreshMode = isCrossOriginUrl(restoredTab.url)
          ? 'reload'
          : 'postMessage'
      }
      tabs.value.push(restoredTab)
    }
    isInitialized.value = true
  }

  const hasTab = (id: string) => tabs.value.some((t) => t.id === id)
  const canAddTab = () =>
    maxTabCount <= 0 || (maxTabCount > 0 && maxTabCount > tabs.value.length)

  const addTab = (tab: ITabItem) => {
    tabs.value.push(tab)
    return Promise.resolve(true)
  }

  const getTab = (id: string) => tabs.value.find((t) => t.id === id) ?? null

  /** 从路由解析 tabInfo，若无则创建默认并写入 query */
  const parseTabInfoFromRoute = (route: RouteLocationNormalizedLoaded): ITabBase => {
    if (route.query.__tab) return decodeTabInfo(route.query.__tab as string)
    const tabInfo: ITabBase = {
      id: ulid(),
      title: t('VueStackTab.undefined'),
      closable: true,
      refreshable: true,
      iframe: false
    }
    route.query.__tab = encodeTabInfo(tabInfo)
    return tabInfo
  }

  /** 查找或创建目标 tab，同步 active 并添加 page */
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
        url: decodeURIComponent(src as string),
        active: true,
        pages
      }
      addTab(targetTab).then(() => {
        emitter.emit(TabEventType.TAB_ACTIVE, { id: tabInfo.id!, isRoute: false })
      })
    } else {
      targetTab.active = true
      if (targetTab.pages.isEmpty() || targetTab.pages.peek()!.id !== page.id) {
        targetTab.pages.push(page)
      }
    }
    return targetTab
  }

  /**
   * 根据当前路由更新/创建标签与页面状态
   * @returns 缓存名、标签信息、目标标签，或 empty/recovered
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
    const cacheName = createPageId(tabInfo.id!, path, route.query.valueOf())
    if (cacheIdsToEvict.has(cacheName)) {
      cacheIdsToEvict.delete(cacheName)
      const cached = components.get(cacheName)
      if (cached) return { recovered: cached, cacheName }
    }

    const page: ITabPage = {
      id: cacheName,
      tabId: tabInfo.id!,
      path: route.path,
      query: route.query as Record<string, string>
    }
    const targetTab = findOrCreateTargetTab(tabInfo, route, cacheName, page)
    saveActiveTabToSession(targetTab)
    return { cacheName, tabInfo, targetTab }
  }

  const resolvePageComponent = (
    ctx: { cacheName: string; tabInfo: ITabBase; targetTab: ITabItem },
    component: VNode
  ): DefineComponent => {
    const { cacheName, tabInfo } = ctx
    if (components.has(cacheName)) {
      addCache(cacheName)
      return components.get(cacheName)!
    }
    const cacheComponent = defineComponent({
      name: cacheName,
      components: { DynamicComponent: component },
      emits: ['onLoaded'],
      setup(_props, context) {
        onMounted(() => {
          context.emit('onLoaded')
          addPageScroller(cacheName, '.cache-page-wrapper')
        })
        onDeactivated(() => saveScroller(cacheName))
        onActivated(() => {
          context.emit('onLoaded')
          restoreScroller(cacheName)
          evictMarkedCaches()
          tabIdsToEvict.clear()
          clearExcludedCacheIdForRefresh(cacheName)
          component.props = null
        })
        onUnmounted(() => removeScroller(cacheName))
        return () => (
          <div
            class="cache-page-wrapper"
            id={'W-' + tabInfo.id}
            style={[useGlobalScroll ? 'overflow:auto' : 'overflow:hidden']}
          >
            <dynamic-component tId={tabInfo.id} pId={cacheName} />
            <PageLoading tabId={tabInfo.id!} />
          </div>
        )
      }
    }) as DefineComponent
    components.set(cacheName, cacheComponent)
    addCache(cacheName)
    return cacheComponent
  }

  const clearExcludedCacheIdForRefresh = (cacheId: string) => {
    excludedCacheIdsForRefresh.value = excludedCacheIdsForRefresh.value.filter((c) => c !== cacheId)
  }

  /**
   * 将路由对应的组件注册为缓存页面，由 tabWrapper 调用
   * @returns 包装后的缓存组件
   */
  const addPage = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
    if (!component) return EmptyPlaceholderComponent as DefineComponent

    const state = updatePageState(route)
    if ('empty' in state) return EmptyPlaceholderComponent as DefineComponent
    if ('recovered' in state) {
      addCache(state.cacheName)
      return state.recovered
    }
    return resolvePageComponent(state, component)
  }

  const renewTab = (tab: ITabData) => {
    const currentTab = getTab(tab.id!)
    if (!currentTab) return
    markTabPagesForEvictionOnly(currentTab)
    evictMarkedCaches()
    currentTab.pages.clear()
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
        ;(emitter as { emit: (t: string, p: string) => void }).emit('REFRESH_IFRAME_POSTMESSAGE', id)
      }
      return
    }

    const currentPageId = tab.pages.peek()?.id
    if (!currentPageId) return

    excludedCacheIdsForRefresh.value = [...excludedCacheIdsForRefresh.value, currentPageId]
    if (tab.active) {
      refreshKey.value++
    }
  }

  const refreshAllTabs = () => {
    const toRefresh: string[] = []
    for (const tab of tabs.value) {
      if (!tab?.refreshable) continue
      if (tab.iframe) {
        if (tab.iframeRefreshMode === 'reload') {
          iframeRefreshKeys.value = {
            ...iframeRefreshKeys.value,
            [tab.id]: (iframeRefreshKeys.value[tab.id] ?? 0) + 1
          }
        } else {
          ;(emitter as { emit: (t: string, p: string) => void }).emit('REFRESH_IFRAME_POSTMESSAGE', tab.id)
        }
      } else {
        const pageId = tab.pages.peek()?.id
        if (pageId) toRefresh.push(pageId)
      }
    }
    if (toRefresh.length > 0) {
      excludedCacheIdsForRefresh.value = [...excludedCacheIdsForRefresh.value, ...toRefresh]
      refreshKey.value++
    }
  }

  const getComponent = (id: string) => components.get(id)

  /**
   * 激活指定标签，更新 active 状态并可选跳转路由
   * @param id - 标签 id
   * @param route - 是否执行 router.push
   */
  const active = (id: string, route = true) => {
    emitter.emit('FORWARD')
    const target = getTab(id)
    if (!target) return
    if (target.active) return

    for (const tab of tabs.value) {
      tab.active = tab.id === id
    }
    saveActiveTabToSession(target as ITabItem)
    // 强制触发 tabs 响应式更新，确保 TabHeader 高亮与 iframe 进入动画 timing 正确
    tabs.value = tabs.value.slice()
    if (route) {
      const top = target.pages.peek()
      if (top) router.push({ path: top.path, query: top.query })
    }
  }

  const reset = () => removeAllTabs()

  const destroy = () => {
    tabs.value.length = 0
    cacheIdsToEvict.clear()
    tabIdsToEvict.clear()
    iframeRefreshKeys.value = {}
    caches.value.length = 0
    components.clear()
    clearSession()
  }

  return {
    tabs,
    caches,
    refreshKey,
    excludedCacheIdsForRefresh,
    isInitialized,
    setMaxSize: setMaxTabCount,
    canAddTab,
    initialize,
    size,
    active,
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
    refreshTab,
    refreshAllTabs,
    iframeRefreshKeys,
    addPageScroller,
    setGlobalScroll: setUseGlobalScroll,
    clearSession,
    setSessionPrefix
  }
}
