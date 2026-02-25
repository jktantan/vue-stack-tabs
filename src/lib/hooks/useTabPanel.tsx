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
  ref,
  cloneVNode
} from 'vue'
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
  evictMarkedCaches,
  evictPageCache
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
      const cacheName = createPageId()
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
        iframeRefreshMode:
          (config as { iframeRefreshMode?: string }).iframeRefreshMode === 'reload'
            ? 'reload'
            : 'postMessage',
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
        restoredTab.iframeRefreshMode = isCrossOriginUrl(restoredTab.url) ? 'reload' : 'postMessage'
      }

      // 核心修复：刷新恢复后，不仅要把 Tab 塞入列表，
      // 更要把里面所有的 Page 的 ULID 重新注册进 keep-alive 的 includes，防止彻底沦为白板无缓存组件
      if (restoredTab.pages && typeof restoredTab.pages.list === 'function') {
        const pages = restoredTab.pages.list()
        pages.forEach((page) => {
          if (page && page.id) addCache(page.id)
        })
      }

      tabs.value.push(restoredTab)
    }
    isInitialized.value = true
  }

  const hasTab = (id: string) => tabs.value.some((t) => t.id === id)
  const canAddTab = () => maxTabCount <= 0 || (maxTabCount > 0 && maxTabCount > tabs.value.length)

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

  /**
   * 查找或创建目标标签，并同步更新 active 状态与 pages 栈。
   *
   * 算法：
   * 1. 遍历所有 tab，将所有 tab.active 置为 false（全部失活）
   * 2. 同时查找 id 匹配的目标 tab（targetTab）
   * 3-a. 若目标 tab 不存在：说明是首次打开该标签，创建新的 ITabItem，初始化 pages 栈并推入当前 page
   * 3-b. 若目标 tab 已存在：
   *      - 设为 active
   *      - 判断当前 page 是否已在栈顶（避免重复入栈）
   *        当路由在同一标签内多次重渲染（响应式触发）时，page.id 与 peek().id 相同，跳过 push
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
      // 全新标签：初始化 pages 栈、从 query.__src 获取 iframe url
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
      } as unknown as ITabItem
      addTab(targetTab).then(() => {
        emitter.emit(TabEventType.TAB_ACTIVE, { id: tabInfo.id!, isRoute: false })
      })
    } else {
      targetTab.active = true
      // 幂等保护：page.id 与当前栈顶相同时不重复入栈
      // 响应式重渲染（如 caches 变更）会重复调用 tabWrapper，需过滤此类重入
      if (targetTab.pages.isEmpty() || targetTab.pages.peek()!.id !== page.id) {
        targetTab.pages.push(page)
      }
    }
    return targetTab
  }

  /**
   * 暴露给外部使用，用于获取指定路由对应的 cacheName
   */
  const getCacheName = () => {
    return createPageId()
  }

  /**
   * 根据当前路由更新/创建标签与页面状态（核心路由适配器）。
   *
   * 该函数在每次 tabWrapper 被调用时执行（即每次 <router-view> 渲染或响应式重渲染时）。
   * 返回三种可能的结果：
   * - { empty: true }                          → 目标标签已被标记为驱逐（关闭态），返回空占位组件
   * - { recovered, cacheName }                  → 页面曾被软标记驱逐（刷新场景），原组件仍存活，直接恢复
   * - { cacheName, tabInfo, targetTab }         → 正常流程，返回完整上下文供 resolvePageComponent 使用
   *
   * cacheName 生成算法：
   *   createPageId(tabId, normalizedPath, queryObject)
   *   使用 tabId + 路径 + query（含 __tab）生成确定性哈希，
   *   同一标签同一路由的 cacheName 始终相同，用作 cacheComponent.name 及 keep-alive include 的键。
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

    // 核心重构：一切以数据栈为准，不再计算 URL 哈希
    let targetTab: ITabItem | null = tabInfo.id ? (getTab(tabInfo.id) as unknown as ITabItem) : null
    let cacheName: string
    let page: ITabPage | null = null

    if (targetTab && !targetTab.pages.isEmpty()) {
      const top = targetTab.pages.peek()
      if (!top) throw new Error('[vue-stack-tabs] Stack is not empty but peek() returned undefined')

      // 数据栈是唯一真相源，只比对 path 即可判断当前路由是否与栈顶一致
      if (top.path === path) {
        cacheName = top.id
      } else {
        // [边界/修复] "空降兵"或"浏览器原生后退"拦截
        // URL 和栈顶对不上！我们被外部改变了。
        const pagesList = targetTab.pages.list()
        let foundIndex = -1
        // 从栈顶往下找，有没有曾经来过的同路由（以此判定是否为 PopState 后退）
        // 只比对 path，因为数据栈才是唯一真相源
        for (let i = pagesList.length - 2; i >= 0; i--) {
          const pastPage = pagesList[i]
          if (pastPage && pastPage.path === path) {
            foundIndex = i
            break
          }
        }

        if (foundIndex !== -1) {
          // 找到了！这是一次浏览器的原生后退行为，因为路由事件触发了所以栈还没来得及退。
          // 手动执行类似 `backward` 的栈回退逻辑以亡羊补牢。
          console.warn(
            '[vue-stack-tabs] Detected native browser back navigation, repairing page stack...'
          )
          const stepsToPop = pagesList.length - 1 - foundIndex
          for (let i = 0; i < stepsToPop; i++) {
            const popped = targetTab.pages.pop()
            // 立即驱逐被错误保留在内存的那些未来组件（在 router 的钩子里也可以，但这里既然已经渲染就直接驱）
            if (popped) evictPageCache(popped.id)
          }
          // 因为我们把不要的都出栈了，现在的栈顶就是以前的这一个记录
          const newTop = targetTab.pages.peek()
          cacheName = newTop ? newTop.id : createPageId()

          if (!newTop) {
            page = {
              id: cacheName,
              tabId: tabInfo.id!,
              path: route.path, // 保持原 query 等参数
              query: route.query as Record<string, string>
            }
          }
        } else {
          // 在历史栈完全没找到，真的是被强行推入的“空降兵”新路由，直接补发一个新的栈记录。
          cacheName = createPageId()
          page = {
            id: cacheName,
            tabId: tabInfo.id!,
            path: route.path, // 保持原 query 等参数
            query: route.query as Record<string, string>
          }
        }
      }
    } else {
      // 这是一个全新创建的 Tab（被外部用空链接无中生有）
      cacheName = createPageId()
      page = {
        id: cacheName,
        tabId: tabInfo.id!,
        path: route.path,
        query: route.query as Record<string, string>
      }
    }

    // 刷新恢复场景：依旧支持软驱逐和组件复用
    if (cacheIdsToEvict.has(cacheName)) {
      cacheIdsToEvict.delete(cacheName)
      const cached = components.get(cacheName)
      if (cached) return { recovered: cached, cacheName }
    }

    // 将 page （如果上面判断它为全新的时候）塞入栈中或建新 Tab
    if (page) {
      targetTab = findOrCreateTargetTab(tabInfo, route, cacheName, page)
    } else {
      // 否则说明这只是同页渲染复用（或者是刷新回来的无变动栈），把 targetTab 直接提拔为 active
      for (const t of tabs.value) t.active = false
      targetTab!.active = true
      if (!cacheName && targetTab && !targetTab.pages.isEmpty()) {
        cacheName = targetTab.pages.peek()!.id
      }
    }

    saveActiveTabToSession(targetTab!)
    return { cacheName, tabInfo, targetTab: targetTab! }
  }

  /**
   * 获取或创建与 cacheName 对应的 cacheComponent（keep-alive 包装组件）。
   *
   * 设计要点：
   *
   * 1. 「组件定义与 VNode 解耦」
   *    旧版实现在 defineComponent 时通过 components: { DynamicComponent: component }
   *    将页面 VNode 锁定为闭包，导致：
   *      - 组件定义本身持有旧 VNode 引用，即使路由参数变化也不更新
   *      - evictPageCache 后重建新定义，但 keep-alive 以 name 为键仍激活旧实例
   *    新版改为通过 props: ['vnode'] + StackTabs.vue 的 :vnode="Component" 动态传入，
   *    每次渲染从父层获取最新 VNode，彻底消除闭包缓存残留。
   *
   * 2. 「cloneVNode 注入 tId / pId」
   *    render 函数执行时，通过 cloneVNode(Node, { tId, pId }) 克隆页面 VNode 并附加标签标识属性。
   *    被渲染的页面组件（如 InternalRouteDetail）通过 attrs.tId / attrs.pId 读取这两个值，
   *    供 useTabRouter 内部定位所属标签与缓存 ID。
   *    （未声明在 defineProps 里的属性自动进入 attrs）
   *
   * 3. 「onActivated 延迟驱逐」
   *    标签切换（非 backward）导致旧页面失活时，旧页面 ID 已由 markCacheForEviction 标记，
   *    等新页面的 cacheComponent onActivated 触发，再批量执行 evictMarkedCaches 是安全的——
   *    此时新页面已就绪，不存在重渲染重建的竞态问题。
   */
  const resolvePageComponent = (ctx: {
    cacheName: string
    tabInfo: ITabBase
    targetTab: ITabItem
  }): DefineComponent => {
    const { cacheName, tabInfo } = ctx

    // 已存在的组件定义直接复用（keep-alive 会在内部找到缓存实例），无需重建
    if (components.has(cacheName)) {
      addCache(cacheName) // 确保再次激活时仍在 include 列表中
      return components.get(cacheName)!
    }

    // 首次进入该缓存页：创建专属 cacheComponent 包装组件
    const cacheComponent = defineComponent({
      // name 与 cacheName 保持一致，作为 keep-alive include 的匹配键
      name: cacheName,
      // vnode 由 StackTabs.vue 的 :vnode="Component" 动态传入（解耦闭包）
      props: {
        vnode: {
          type: Object as () => VNode,
          required: false,
          default: undefined
        }
      },
      emits: ['onLoaded'],
      setup(props, context) {
        // 用于在当前组件活跃期内存下回退参数，离开或重返时将更新或清理，真正实现生命周期同步！
        const localBackParams = ref<Record<string, unknown> | null>(null)

        const checkAndConsumeBackParams = () => {
          try {
            const tab = getTab(tabInfo.id!)
            const top = tab?.pages.peek()
            if (top && top.id === cacheName && top._backParams) {
              localBackParams.value = { ...top._backParams }
              // 取出后阅后即焚，防止从别处循环回退时拿到过期老参
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
          const dynamicBackProps = localBackParams.value ? { _back: localBackParams.value } : {}

          return (
            <div
              class="cache-page-wrapper"
              id={`W-${cacheName}`}
              style={[useGlobalScroll ? 'overflow:auto' : 'overflow:hidden', 'height: 100%']}
            >
              {/* cloneVNode 附加 tId / pId 以及每次动态截留的 _back 回退参数 */}
              {Node
                ? cloneVNode(Node, { tId: tabInfo.id, pId: cacheName, ...(dynamicBackProps || {}) })
                : null}
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

  // 刷新隔离名单功能已由全新 ID 替换法替代

  /**
   * 将路由对应的组件注册为缓存页面（由 StackTabs.vue 的 tabWrapper 调用）。
   *
   * 流程：
   * 1. 若 component 为空（router-view 未匹配到路由），返回空占位组件
   * 2. updatePageState 解析路由状态：
   *    - empty    → 标签已关闭，返回空占位
   *    - recovered → 刷新恢复，直接 addCache 并返回原组件
   *    - 正常      → 调用 resolvePageComponent 获取/创建 cacheComponent
   *
   * @param component StackTabs.vue 传入的原始 VNode（来自 <router-view> 的 Component 插槽）
   * @returns 用于 <component :is> 的 cacheComponent 包装定义
   */
  /** 当前正在渲染的页面的缓存 Key（ULID），供 StackTabs.vue 的 :key 绑定使用 */
  const activeCacheKey = ref<string>('')

  const addPage = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
    if (!component) return EmptyPlaceholderComponent as DefineComponent

    const state = updatePageState(route)
    if ('empty' in state) return EmptyPlaceholderComponent as DefineComponent
    if ('recovered' in state) {
      // 刷新场景：组件定义仍存活，只需重新加入 include 列表即可
      addCache(state.cacheName)
      activeCacheKey.value = state.cacheName
      return state.recovered
    }
    activeCacheKey.value = state.cacheName
    return resolvePageComponent(state)
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
        ;(emitter as { emit: (t: string, p: string) => void }).emit(
          'REFRESH_IFRAME_POSTMESSAGE',
          id
        )
      }
      return
    }

    const currentPage = tab.pages.peek()
    if (!currentPage) return

    // 新架构：真正的刷新 = 把栈顶的旧组件数据连根拔起并注销，让它换个新 ID 重新走生命周期
    const oldId = currentPage.id
    evictPageCache(oldId) // 清除旧缓存

    // 生成全新 ID，相当于把原页面配方注入了一个崭新的组件身份
    currentPage.id = createPageId()
    addCache(currentPage.id)

    if (tab.active) {
      // 激活状态下，增加 refreshKey 强制触发当前 Router 的重排，
      // 由于 `<keep-alive>` 中之前记录的名字已经被驱逐出境，它会自动使用新 ID 创建一个全新页面。
      refreshKey.value++
    }
  }

  const refreshAllTabs = () => {
    let needsActiveRefresh = false

    for (const tab of tabs.value) {
      if (!tab?.refreshable) continue
      if (tab.iframe) {
        if (tab.iframeRefreshMode === 'reload') {
          iframeRefreshKeys.value = {
            ...iframeRefreshKeys.value,
            [tab.id]: (iframeRefreshKeys.value[tab.id] ?? 0) + 1
          }
        } else {
          ;(emitter as { emit: (t: string, p: string) => void }).emit(
            'REFRESH_IFRAME_POSTMESSAGE',
            tab.id
          )
        }
      } else {
        const currentPage = tab.pages.peek()
        if (currentPage) {
          const oldId = currentPage.id
          evictPageCache(oldId)
          currentPage.id = createPageId()
          addCache(currentPage.id)

          if (tab.active) {
            needsActiveRefresh = true
          }
        }
      }
    }

    if (needsActiveRefresh) {
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
      if (top) {
        // 切换 Tab 走路由时，必须将 __tab 编码信息注入 query，
        // 否则 parseTabInfoFromRoute 找不到对应 Tab，会新建匿名标签！
        const __tab = encodeTabInfo({
          id: target.id,
          title: target.title,
          closable: target.closable,
          refreshable: target.refreshable,
          iframe: target.iframe
        })
        const query = defu({ __tab }, top.query || {})
        router.push({ path: top.path, query })
      }
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
    activeCacheKey,
    isInitialized,
    setMaxSize: setMaxTabCount,
    canAddTab,
    initialize,
    size,
    active,
    getCacheName,
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
    setGlobalScroll: setUseGlobalScroll,
    clearSession,
    setSessionPrefix
  }
}
