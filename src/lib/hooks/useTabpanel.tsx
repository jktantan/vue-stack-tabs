import type { ITabData, ITabItem, ITabPage } from '../model/TabModel'
import {
  defineComponent,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  unref
} from 'vue'
import type { DefineComponent, VNode } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { ulid } from 'ulidx'
import { encodeTabInfo, createPageId, decodeTabInfo } from '../utils/TabIdHelper'
import { defu } from 'defu'
import { Stack } from '../model/TabModel'
import { uriDecode } from '../utils/UriHelper'
import PageLoading from '../components/PageLoading.vue'
import { MittType, useEmitter } from './useTabMitt'
const tabs = ref<ITabItem[]>([])
const defaultTabs: ITabItem[] = []
// cache
const caches = ref<string[]>([])
// Dynamic components
const components = new Map<string, any>()
const deletableCache = new Set<String>()
const pageShown = ref<boolean>(true)
const SESSION_TAB_NAME = 'stacktab-active-tab'
const pageScroller = new Map<string, Map<string, any>>()
let initialed = false
let max = 0
let scrollbar = false
export default () => {
  const router = useRouter()
  const emitter = useEmitter()
  const size = (): number => {
    return tabs.value.length
  }
  /**
   * Init the Tab list
   */
  const initial = (staticTabs: ITabData[]) => {
    // add default tabs
    defaultTabs.splice(0)
    caches.value.splice(0)
    deletableCache.clear()
    components.clear()
    for (const item of staticTabs) {
      // const id = ulid()
      const fullItem = defu(item, { id: ulid() })
      const __tab = encodeTabInfo(fullItem)
      const uri = uriDecode(fullItem.path)
      const config = defu(fullItem, {
        closable: true,
        refreshable: true,
        iframe: false
      })
      const cacheName = createPageId(fullItem.id, uri.path, uri.query)
      const page: ITabPage = {
        id: cacheName,
        tabId: fullItem.id,
        path: uri.path,
        query: defu(uri.query, { __tab })
      }
      const pages = new Stack<ITabPage>()
      pages.push(page)
      const tab: ITabItem = {
        id: fullItem.id,
        title: config.title,
        closable: config.closable,
        refreshable: config.refreshable,
        iframe: config.iframe,
        active: false,
        pages
      }

      defaultTabs.push(tab)
      tabs.value.push(tab)
      caches.value.push(cacheName)
    }

    // add temp tab from session
    const tempTab = window.sessionStorage.getItem(SESSION_TAB_NAME)
    if (tempTab !== null && tempTab !== undefined) {
      // const tempItems = JSON.parse(window.sessionStorage.getItem('tabItems')!)
      const temp = JSON.parse(tempTab, (k, v) => {
        if (k === 'pages') {
          return new Stack<ITabPage>(v)
        } else {
          return v
        }
      })
      // const temp = defu({ pages: new Stack<ITabPage>() }, tempItems) as ITabItem
      let hasTab = false
      for (const tab of tabs.value) {
        if (tab.id === temp.id) {
          hasTab = true
          break
        }
      }
      if (!hasTab) {
        tabs.value.push(temp)
      }
    }
    initialed = true
  }
  const hasTab = (id: string) => {
    for (const tab of tabs.value) {
      if (tab.id === id) {
        return true
      }
    }
    return false
  }
  const canAddTab = () => {
    return max <= 0 || (max > 0 && max > tabs.value.length)
  }
  const addTab = (tab: ITabItem) => {
    return new Promise((resolve) => {
      tabs.value.push(tab)
      resolve(true)
    })
  }
  const getTab = (id: string) => {
    for (const tab of tabs.value) {
      if (tab.id === id) {
        return tab
      }
    }
    return null
  }
  const addPage = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
    let cacheComponent: DefineComponent
    const tabInfo = decodeTabInfo(route.query.__tab as string)
    const cacheName = createPageId(tabInfo.id!, route.path, route.query.valueOf())
    const src = route.query.__src
    // 增加tab
    let activeTab: ITabItem | null = null
    for (const tab of unref(tabs)) {
      tab.active = false
      if (tab.id === tabInfo.id) {
        activeTab = tab as ITabItem
      }
    }
    const page: ITabPage = {
      id: cacheName,
      tabId: tabInfo.id!,
      path: route.path,
      query: route.query as Record<string, string>
    }

    if (activeTab === null) {
      const pages = new Stack<ITabPage>()
      pages.push(page)
      activeTab = {
        id: tabInfo.id!,
        title: tabInfo.title,
        closable: tabInfo.closable!,
        refreshable: tabInfo.refreshable!,
        iframe: tabInfo.iframe!,
        url: decodeURIComponent(src as string),
        active: true,
        pages
      }
      addTab(activeTab).then(() => {
        emitter.emit(MittType.TAB_ACTIVE, { id: tabInfo.id!, isRoute: false })
      })
    } else {
      activeTab.active = true
      if (activeTab.pages.isEmpty() || activeTab.pages.peek()!.id !== page.id) {
        activeTab.pages.push(page)
      }
    }
    updateSession(activeTab)
    // const cacheSet = new Set(caches.value)
    if (components.has(cacheName)) {
      cacheComponent = components.get(cacheName)!
    } else {
      // 增加控件
      cacheComponent = defineComponent({
        name: cacheName!,
        components: {
          DynamicComponent: component
        },
        emits: {
          onLoaded: null
        },
        setup(props, context) {
          onMounted(() => {
            context.emit('onLoaded')
            addPageScroller(cacheName, '.cache-page-wrapper')
          })
          onDeactivated(() => {
            saveScroller(cacheName)
          })
          onActivated(() => {
            restoreScroller(cacheName)
            console.log(pageScroller.get(cacheName))
            removeDeletableCache()
            component.props = null
          })
          onUnmounted(() => {
            console.log('on unMounted', cacheName)
            removeScroller(cacheName)
            // setTimeout(() => {
            // 刷新时重置路由
            // pageShown.value = true
            // }, 500)
          })
          return () => (
            <div
              class="cache-page-wrapper"
              id={'W-' + tabInfo.id}
              style={[scrollbar ? 'overflow:auto' : 'overflow:hidden']}
            >
              <dynamic-component tId={tabInfo.id} pId={cacheName} />
              <PageLoading tId={tabInfo.id!} />
            </div>
          )
        }
      })
      components.set(cacheName, cacheComponent)

      //
    }

    // 加入缓存
    // const cacheSet = new Set(caches.value)
    // if (routerAlive.value) {
    // if (!cacheSet.has(cacheName)) {
    //   caches.value.push(cacheName)
    // }
    // }
    addCache(cacheName)
    return cacheComponent
  }
  const restoreScroller = (pageId: string) => {
    const scroller = pageScroller.get(pageId)
    if (scroller) {
      for (const key of scroller.keys()) {
        if (document.querySelector(key)) {
          const result = scroller.get(key)!
          document.querySelector(key)!.scrollTop = result.top
          document.querySelector(key)!.scrollLeft = result.left
        }
      }
    }
  }
  const saveScroller = (pageId: string) => {
    const scroller = pageScroller.get(pageId)
    if (scroller) {
      for (const key of scroller.keys()) {
        const result = {
          top: document.querySelector(key)?.scrollTop ?? 0,
          left: document.querySelector(key)?.scrollLeft ?? 0
        }
        scroller.set(key, result)
      }
    }
  }

  const removeScroller = (pageId: string) => {
    const scroller = pageScroller.get(pageId)!
    if (scroller) {
      scroller.clear()
      pageScroller.delete(pageId)
    }
  }
  const addPageScroller = (pageId: string, ...scrollerIds: string[]) => {
    if (!pageScroller.has(pageId)) {
      pageScroller.set(pageId, new Map<string, number>())
    }
    const scroller = pageScroller.get(pageId)!
    for (const sId of scrollerIds) {
      scroller.set(sId, { top: 0, left: 0 })
    }
  }
  /**
   * if id is null , then remove all tab that deleted is true
   * @param id
   */
  const removeTab = (id: string): string => {
    let activeTabId = ''
    for (let i = tabs.value.length - 1; i >= 0; i--) {
      if (id === unref(tabs)[i].id) {
        //if it's not closable then return
        if (!unref(tabs)[i].closable) {
          return id
        }
        for (const item of unref(tabs)[i].pages.list()) {
          removeComponent(item.id)
          markDeletableCache(item.id)
        }
        unref(tabs)[i].pages.clear()
        if (tabs.value.length > 1 && unref(tabs)[i].active) {
          if (i === 0) {
            activeTabId = unref(tabs)[i + 1].id
          } else {
            activeTabId = unref(tabs)[i - 1].id
          }
        }
        unref(tabs).splice(i, 1)

        break
      }
    }
    if (activeTabId !== '') {
      emitter.emit(MittType.TAB_ACTIVE, { id: activeTabId })
      // active(activeTabId)
    }
    // if remove inactive tab,then we need remove the cache manually.
    removeDeletableCache()
    return activeTabId
  }

  const removeAllTabs = () => {
    const uTabs = unref(tabs)
    for (let i = uTabs.length - 1; i >= 0; i--) {
      if (uTabs[i].closable) {
        for (const item of uTabs[i].pages.list()) {
          removeComponent(item.id)
          markDeletableCache(item.id)
        }
        unref(tabs)[i].pages.clear()
        unref(tabs).splice(i, 1)
      }
    }
    for (const stay of uTabs) {
      if (stay.active) {
        removeDeletableCache()
        return
      }
    }
    // 如果都是非Active状态，就把最后一个active
    emitter.emit(MittType.TAB_ACTIVE, { id: uTabs[uTabs.length - 1].id })
    // active(uTabs[uTabs.length - 1].id)
  }
  const removeOtherTabs = (id: string) => {
    const uTabs = unref(tabs)
    let activeTab
    for (let i = uTabs.length - 1; i >= 0; i--) {
      if (uTabs[i].id === id) {
        activeTab = uTabs[i]
      } else if (uTabs[i].closable && uTabs[i].id !== id) {
        for (const item of uTabs[i].pages.list()) {
          removeComponent(item.id)
          markDeletableCache(item.id)
        }
        unref(tabs)[i].pages.clear()
        unref(tabs).splice(i, 1)
      }
    }
    if (!activeTab!.active) {
      emitter.emit(MittType.TAB_ACTIVE, { id })
      // active(id)
    } else {
      removeDeletableCache()
    }
  }
  /**
   * 关闭左边
   * @param id
   */
  const removeLeftTabs = (id: string) => {
    let startIndex = -1
    const uTabs = unref(tabs)
    for (let i = 0; i < uTabs.length; i++) {
      if (uTabs[i].id === id) {
        startIndex = i - 1
        break
      }
    }
    for (let i = startIndex; i >= 0; i--) {
      if (uTabs[i].closable) {
        for (const item of uTabs[i].pages.list()) {
          removeComponent(item.id)
          markDeletableCache(item.id)
        }
        unref(tabs)[i].pages.clear()
        unref(tabs).splice(i, 1)
      }
    }
    for (const stay of uTabs) {
      if (stay.active) {
        removeDeletableCache()
        return
      }
    }
    // 如果都是非Active状态，就把最后一个active
    emitter.emit(MittType.TAB_ACTIVE, { id: uTabs[0].id })
    // active(uTabs[0].id)
  }

  /**
   * 关闭右边
   * @param id
   */
  const removeRightTabs = (id: string) => {
    const uTabs = unref(tabs)
    let startIndex = uTabs.length
    for (let i = 0; i < uTabs.length; i++) {
      if (uTabs[i].id === id) {
        startIndex = i + 1
        break
      }
    }
    for (let i = uTabs.length - 1; i >= startIndex; i--) {
      if (uTabs[i].closable) {
        for (const item of uTabs[i].pages.list()) {
          removeComponent(item.id)
          markDeletableCache(item.id)
        }
        unref(tabs)[i].pages.clear()
        unref(tabs).splice(i, 1)
      }
    }
    for (const stay of uTabs) {
      if (stay.active) {
        removeDeletableCache()
        return
      }
    }
    emitter.emit(MittType.TAB_ACTIVE, { id: uTabs[uTabs.length - 1].id })
    // active(uTabs[uTabs.length - 1].id)
  }

  /**
   * 刷新
   */
  const refreshTab = (id: string) => {
    // const uTabs = unref(tabs)
    for (const uTabs of unref(tabs)) {
      if (uTabs.id === id) {
        const currentPageId = uTabs.pages.peek()?.id
        for (let i = caches.value.length - 1; i >= 0; i--) {
          const cacheId = caches.value[i]
          if (cacheId === currentPageId) {
            caches.value.splice(i, 1)
            // 如果要刷新的是显示的TAB
            if (uTabs.active) {
              pageShown.value = false
            }
            break
          }
        }
        break
      }
    }
  }
  /**
   * 全部刷新
   */
  const refreshAllTabs = () => {
    const refreshPage = new Set<string>()
    tabs.value.forEach((value) => {
      refreshPage.add(value.pages.peek()!.id)
    })
    for (let i = caches.value.length - 1; i >= 0; i--) {
      const cacheId = caches.value[i]
      if (refreshPage.has(cacheId)) {
        caches.value.splice(i, 1)
      }
    }
    pageShown.value = false
  }

  const addComponent = (id: string, comp: DefineComponent) => {
    components.set(id, comp)
  }
  const getComponent = (id: string) => {
    return components.get(id)
  }
  const removeComponent = (id: string) => {
    components.delete(id)
  }

  /**
   * Delete the cache after new Page loaded.
   * @param cacheName
   */
  const markDeletableCache = (cacheName: string) => {
    deletableCache.add(cacheName)
  }
  const removeDeletableCache = () => {
    for (let i = caches.value.length - 1; i >= 0; i--) {
      if (deletableCache.has(caches.value[i])) {
        unref(caches).splice(i, 1)
      }
    }
    deletableCache.clear()
  }
  const removeCache = (cacheName: string) => {
    for (let i = caches.value.length - 1; i >= 0; i--) {
      if (cacheName === caches.value[i]) {
        unref(caches).splice(i, 1)
      }
    }
  }
  const addCache = (cacheName: string) => {
    const cacheSet = new Set(caches.value)
    if (!cacheSet.has(cacheName)) {
      caches.value.push(cacheName)
    }
  }

  /**
   * active the tab,
   * @param id
   * @param route
   * @return true if already actived
   */
  const active = (id: string, route = true) => {
    return new Promise((resolve) => {
      for (let i = tabs.value.length - 1; i >= 0; i--) {
        const tab = tabs.value[i] as ITabItem
        if (tab.id === id) {
          if (tab.active) {
            break
          } else {
            tab.active = true
            pageShown.value = false
            updateSession(tab)
            if (route) {
              const top = tab.pages.peek()
              router.push({
                path: top!.path,
                query: top!.query
              })
            }
          }
        } else {
          tabs.value[i].active = false
        }
      }
      resolve(true)
    })
  }
  /**
   * save current tab info into Browser's session
   * @param id
   */
  const updateSession = (tab: ITabItem) => {
    // window.sessionStorage.setItem('tabItems', JSON.stringify(currentItems?.values()))
    window.sessionStorage.setItem(SESSION_TAB_NAME, JSON.stringify(tab))
  }
  const reset = () => {
    destroy()
    unref(tabs).push(...defaultTabs)
    emitter.emit(MittType.TAB_ACTIVE, { id: defaultTabs[0].id! })
    // active(defaultTabs[0].id)
  }
  const destroy = () => {
    unref(tabs).splice(0)
    components.clear()
    deletableCache.clear()
    unref(caches).splice(0)
    pageShown.value = false
  }
  const setMaxSize = (size: number) => {
    max = size
  }
  const setGlobalScroll = (globalScroll: boolean) => {
    scrollbar = globalScroll
  }

  return {
    tabs,
    caches,
    pageShown,
    initialed,
    setMaxSize,
    canAddTab,
    initial,
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
    addPage,
    addComponent,
    getComponent,
    removeComponent,
    markDeletableCache,
    removeDeletableCache,
    refreshTab,
    refreshAllTabs,
    addPageScroller,
    setGlobalScroll
  }
}
