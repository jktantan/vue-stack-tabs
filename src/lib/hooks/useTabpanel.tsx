import type { ITabData, ITabItem, ITabPage } from '@/lib/model/TabModel'
import { defineComponent, onActivated, onUnmounted, ref, unref } from 'vue'
import type { DefineComponent, VNode } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { ulid } from 'ulidx'
import { encodeTabInfo, createPageId, decodeTabInfo } from '@/lib/utils/TabIdHelper'
import { defu } from 'defu'
import { Stack } from '@/lib/model/TabModel'
import { uriDecode } from '@/lib/utils/UriHelper'

const tabs = ref<ITabItem[]>([])
const defaultTabs: ITabItem[] = []
// cache
const caches = ref<string[]>([])
// Dynamic components
const components = new Map<string, DefineComponent>()
const deletableCache = new Set<String>()
const pageShown = ref<boolean>(true)
const SESSION_TAB_NAME = 'stacktab-active-tab'
export default () => {
  const router = useRouter()
  const size = (): number => {
    return tabs.value.length
  }
  /**
   * Init the Tab list
   */
  const initial = async (staticTabs: ITabData[]) => {
    // add default tabs
    defaultTabs.splice(0)
    for (const item of staticTabs) {
      const id = ulid()
      const __tab = await encodeTabInfo(defu(item, { id }))
      const uri = uriDecode(item.path)
      const config = defu(item, {
        closable: true,
        refreshable: true,
        iframe: false
      })
      const cacheName = await createPageId(id, uri.path, uri.query)
      const page: ITabPage = {
        id: cacheName,
        tabId: id,
        path: uri.path,
        query: defu(uri.query, { __tab })
      }
      const pages = new Stack<ITabPage>()
      pages.push(page)
      const tab: ITabItem = {
        id,
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
      const temp = JSON.parse(tempTab)
      let hasTab = false
      for (const tab of tabs.value) {
        if (tab.id === temp.tab.id) {
          hasTab = true
          break
        }
      }
      if (!hasTab) {
        tabs.value.push(temp.tab)
      }
    }
  }
  const hasTab = (id: string) => {
    for (const tab of tabs.value) {
      if (tab.id === id) {
        return true
      }
    }
    return false
  }
  const addTab = (tab: ITabItem) => {
    tabs.value.push(tab)
  }
  const addPage = async (
    route: RouteLocationNormalizedLoaded,
    component: VNode
  ): Promise<DefineComponent> => {
    let cacheComponent: DefineComponent
    const tabInfo = await decodeTabInfo(route.query.__tab as string)
    const cacheName = await createPageId(tabInfo.id!, route.path, route.query.valueOf())
    const src = route.query.__src
    const cacheSet = new Set(caches.value)
    if (components.has(cacheName)) {
      cacheComponent = components.get(cacheName)!
    } else {
      // 增加控件
      cacheComponent = defineComponent({
        name: cacheName!,
        components: {
          DynamicComponent: component
        },
        setup() {
          // onMounted(() => {
          //   removeCache()
          // })
          onActivated(() => {
            removeDeletableCache()
            component.props = null
          })
          onUnmounted(() => {
            console.log('on unMounted', cacheName)
            // setTimeout(() => {
            // 刷新时重置路由
            // pageShown.value = true
            // }, 500)
          })
          return () => (
            <div class="cache-page-wrapper">
              <dynamic-component tId={tabInfo.id} pId={cacheName} />
            </div>
          )
        }
      })
      components.set(cacheName, cacheComponent)

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
        tabs.value.push(activeTab!)
      } else {
        activeTab.active = true
        if (activeTab.pages.peek()!.id !== page.id) {
          activeTab.pages.push(page)
        }
      }
      updateSession(activeTab)
      //
    }

    // 加入缓存
    // const cacheSet = new Set(caches.value)
    // if (routerAlive.value) {
    if (!cacheSet.has(cacheName)) {
      caches.value.push(cacheName)
    }
    // }
    return cacheComponent
  }
  /**
   * if id is null , then remove all tab that deleted is true
   * @param id
   */
  const removeTab = (id: string): string => {
    let activeTabId = ''
    for (let i = tabs.value.length - 1; i >= 0; i--) {
      if (id === unref(tabs)[i].id) {
        if (!unref(tabs)[i].closable) {
          break
        }
        for (const item of unref(tabs)[i].pages.list()) {
          removeComponent(item.id)
          markDeletableCache(item.id)
        }
        unref(tabs)[i].pages.clear()
        if (tabs.value.length > 1) {
          if (i === 0) {
            activeTabId = unref(tabs)[1].id
          } else {
            activeTabId = unref(tabs)[i - 1].id
          }
        }
        unref(tabs).splice(i, 1)

        break
      }
    }
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
        return
      }
    }
    // 如果都是非Active状态，就把最后一个active
    active(uTabs[uTabs.length - 1].id)
  }
  const removeOtherTabs = (id: string) => {
    const uTabs = unref(tabs)
    let activeTab
    for (let i = uTabs.length - 1; i >= 0; i--) {
      if (uTabs[i].closable && uTabs[i].id !== id) {
        for (const item of uTabs[i].pages.list()) {
          removeComponent(item.id)
          markDeletableCache(item.id)
        }
        unref(tabs)[i].pages.clear()
        unref(tabs).splice(i, 1)
      }

      if (uTabs[i].id === id) {
        activeTab = uTabs[i]
      }
    }
    if (!activeTab!.active) {
      active(id)
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
        return
      }
    }
    // 如果都是非Active状态，就把最后一个active
    active(uTabs[0].id)
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
        return
      }
    }
    active(uTabs[uTabs.length - 1].id)
  }

  /**
   * 刷新
   */
  const refreshTab = (id: string) => {
    const uTabs = unref(tabs)
    for (let i = 0; i < uTabs.length; i++) {
      if (uTabs[i].id === id) {
        const currentPageId = uTabs[i].pages.peek()?.id
        for (let i = caches.value.length - 1; i >= 0; i--) {
          const cacheId = caches.value[i]
          if (cacheId === currentPageId) {
            caches.value.splice(i, 1)
            // 如果要刷新的是显示的TAB
            if (uTabs[i].active) {
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
    for (let i = tabs.value.length - 1; i >= 0; i--) {
      const tab = tabs.value[i]
      if (tab.id === id) {
        if (tab.active) {
          break
        } else {
          tab.active = true
          pageShown.value = false
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
    active(defaultTabs[0].id)
  }
  const destroy = () => {
    unref(tabs).splice(0)
    components.clear()
    deletableCache.clear()
    unref(caches).splice(0)
    pageShown.value = true
  }

  return {
    tabs,
    caches,
    pageShown,
    initial,
    size,
    active,
    destroy,
    reset,
    addCache,
    removeCache,
    addTab,
    removeTab,
    removeAllTabs,
    removeLeftTabs,
    removeRightTabs,
    removeOtherTabs,
    hasTab,
    addPage,
    addComponent,
    removeComponent,
    markDeletableCache,
    removeDeletableCache,
    refreshTab,
    refreshAllTabs
  }
}
