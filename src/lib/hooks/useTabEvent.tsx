import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { VNode, DefineComponent } from 'vue'
import { defu } from 'defu'
import { ulid } from "ulidx"
import { TabItemData } from '../model/TabHeaderModel'
import { Stack } from '../model/TabModel'
import type { PageRouteLocationRaw, DefaultTabData } from '../model/TabModel'
import { ContainerType } from '../model/TabContainerModel'
import { decodeTabId, encodeTabid, getPageId } from '../utils/TabIdHelper'
import { useRouter } from 'vue-router'
import { onActivated, onUnmounted, ref, unref } from 'vue'

/**
 * 整个TAB的操控在这里进行
 */

// tabs
const tabs = ref<TabItemData[]>([])
// 缓存控制
const caches = ref<string[]>([])
// 动态组件缓存
const components = new Map<string, any>()
// 栈控制
const tabItems: Map<string, Stack<PageRouteLocationRaw>> = new Map<
  string,
  Stack<PageRouteLocationRaw>
>()
// 可删除的数据
const deletable = new Set<string>()
const routerAlive = ref<boolean>(true)
const routerLeaved = ref<boolean>(true)
const defaultTabs: DefaultTabData[] = []
/**
 * 删除所有数据
 * @param tabStack
 */
const removeData = (tabStack: Stack<PageRouteLocationRaw>) => {
  tabStack.values().forEach((value) => {
    deletable.add(value.pId)
    components.delete(value.pId)
    // for (let i = caches.value.length - 1; i >= 0; i--) {
    //   if (caches.value[i] === value.pId) {
    //     caches.value.splice(i, 1)
    //   }
    // }
  })
}
export default () => {
  const router = useRouter()

  /**
   * 关闭tab
   * 1. 关闭Tab
   * 2. 新页面打开后删除要关闭Tab的所有有缓存数据
   * @param tab
   */
  const close = (tab: TabItemData): string => {
    let result: string = tab.id
    removeData(tabItems.get(tab.id)!)
    tabItems.delete(tab.id)

    // if (tabItems) {
    const uTabs = unref(tabs)
    for (let i = 0; i < uTabs.length; i++) {
      if (uTabs[i].id === tab.id) {
        if (uTabs[i].active) {
          if (i > 0) {
            // tabItems![i - 1].active = true
            result = uTabs![i - 1].id
            active(result)
          }
          if (i === 0 && uTabs!.length > 1) {
            // tabItems![i + 1].active = true
            result = uTabs![i - 1].id
            active(result)
          }
        }
        uTabs.splice(i, 1)
        break
      }
    }
    return result
  }
  const closeAll = (): string => {
    const uTabs = unref(tabs)
    for (let i = uTabs.length - 1; i >= 0; i--) {
      if (uTabs[i].closable) {
        removeData(tabItems.get(uTabs[i].id)!)
        tabItems.delete(uTabs[i].id)
        uTabs.splice(i, 1)
      }
    }
    for (const stay of uTabs) {
      if (stay.active) {
        return stay.id
      }
    }
    const result: string = uTabs[uTabs.length - 1].id
    // 如果都是非Active状态，就把最后一个active
    active(result)
    return result
  }
  const closeOthers = (tab: TabItemData) => {
    const uTabs = unref(tabs)
    for (let i = uTabs.length - 1; i >= 0; i--) {
      if (uTabs[i].closable && uTabs[i].id !== tab.id) {
        removeData(tabItems.get(uTabs[i].id)!)
        tabItems.delete(uTabs[i].id)
        uTabs.splice(i, 1)
      }
    }
    active(tab.id)
  }
  /**
   * 关闭左边
   * @param tab
   */
  const closeLeft = (tab: TabItemData) => {
    let startIndex = -1
    const uTabs = unref(tabs)
    for (let i = 0; i < uTabs.length; i++) {
      if (uTabs[i].id === tab.id) {
        startIndex = i - 1
        break
      }
    }
    for (let i = startIndex; i >= 0; i--) {
      if (uTabs[i].closable) {
        removeData(tabItems.get(uTabs[i].id)!)
        tabItems.delete(uTabs[i].id)
        uTabs.splice(i, 1)
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
   * @param tab
   */
  const closeRight = (tab: TabItemData) => {
    const uTabs = unref(tabs)
    let startIndex = uTabs.length
    for (let i = 0; i < uTabs.length; i++) {
      if (uTabs[i].id === tab.id) {
        startIndex = i + 1
        break
      }
    }
    for (let i = uTabs.length - 1; i >= startIndex; i--) {
      if (uTabs[i].closable) {
        removeData(tabItems.get(uTabs[i].id)!)
        tabItems.delete(uTabs[i].id)
        uTabs.splice(i, 1)
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
  const refresh = (tab: TabItemData) => {
    const currentPageId = tabItems.get(tab.id)?.peek().pId
    for (let i = caches.value.length - 1; i >= 0; i--) {
      const cacheId = caches.value[i]
      if (cacheId === currentPageId) {
        caches.value.splice(i, 1)
        // 如果要刷新的是显示的TAB
        if (tab.active) {
          routerAlive.value = false
          routerLeaved.value = false
          //   console.log(routerAlive)
          // setTimeout(() => {
          //   routerAlive.value = true
          // }, 500)
        }
        break
      }
    }
  }
  /**
   * 全部刷新
   */
  const refreshAll = () => {
    const refreshPage = new Set<string>()
    tabItems.forEach((value) => {
      refreshPage.add(value.peek().pId)
    })
    for (let i = caches.value.length - 1; i >= 0; i--) {
      const cacheId = caches.value[i]
      if (refreshPage.has(cacheId)) {
        caches.value.splice(i, 1)
      }
    }
    routerAlive.value = false
    routerLeaved.value = false
    // nextTick(() => {
    //   setTimeout(() => {
    //     routerAlive.value = true
    //   }, 500)
    // })
  }

  const setTemplate = (id: string) => {
    let currentTab
    for (const item of tabs.value) {
      if (item.id === id) {
        currentTab = item
      }
    }
    if (currentTab) {
      const currentItems = tabItems.get(id)
      // window.sessionStorage.setItem('tabItems', JSON.stringify(currentItems?.values()))
      window.sessionStorage.setItem(
        'tab',
        JSON.stringify({
          tab: currentTab,
          items: currentItems?.values()
        })
      )
    }
  }
  /**
   * 激活 tab（这里会遇到没有初始化的数据）
   * @param id
   */
  const active = (id: string): boolean => {
    let hasTab = false
    for (const item of unref(tabs)) {
      if (item.id === id) {
        if (!item.active) {
          item.active = true
        } else {
          return true
        }
        hasTab = true
      } else {
        item.active = false
      }
    }
    if (tabs.value.length > 0) {
      routerAlive.value = false
      routerLeaved.value = false
    }
    if (hasTab) {
      // setTimeout(() => {
      //   nextTick().then(() => {
      const top = tabItems.get(id)?.peek()
      if (top !== null && top !== undefined) {
        router.push({
          path: top!.path,
          query: top!.query
        })
      }

      //   })
      // }, 150)
    }
    setTemplate(id)
    // 返回是否已有Tab,没有的话要新建
    return hasTab
  }

  const removeCache = () => {
    if (deletable.size > 0) {
      for (let i = caches.value.length - 1; i >= 0; i--) {
        if (deletable.has(caches.value[i])) {
          unref(caches).splice(i, 1)
        }
      }
      deletable.clear()
    }
  }

  /**
   * 增加新的页面（这城会遇到没有初始化的默认页面）
   * @param route
   * @param component
   */
  const addTab = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
    let cacheComponent
    const tabInfo = decodeTabId(route.query.__tab as string)
    const cacheName = getPageId(tabInfo.id, route.path, route.query.valueOf())
    const src = route.query.__src
    const cacheSet = new Set(caches.value)
    if (components.has(cacheName)) {
      cacheComponent = components.get(cacheName)
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
            removeCache()
            component.props = null
          })
          onUnmounted(() => {
            console.log('on unMounted', cacheName)
            // setTimeout(() => {
            // 刷新时重置路由
            routerAlive.value = true
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
      if (!tabItems.has(tabInfo.id)) {
        tabItems.set(tabInfo.id, new Stack<PageRouteLocationRaw>())
        tabs.value.push({
          id: tabInfo.id,
          title: tabInfo.name,
          closable: tabInfo.closable,
          type: src ? ContainerType.IFRAME : ContainerType.PAGE,
          url: decodeURIComponent(src as string),
          active: true
        })
      } else {
        for (const tab of tabs.value) {
          if (tab.id === tabInfo.id) {
            tab.active = true
            break
          }
        }
      }
      const topPage = tabItems.get(tabInfo.id)?.peek()
      if (topPage?.pId !== cacheName) {
        tabItems.get(tabInfo.id)?.push({
          pId: cacheName,
          path: route.path,
          query: route.query
        })
      }
      setTemplate(tabInfo.id)
      //
    }

    // 加入缓存
    // const cacheSet = new Set(caches.value)
    if (routerAlive.value) {
      if (!cacheSet.has(cacheName)) {
        caches.value.push(cacheName)
      }
    }
    return cacheComponent
  }

  /**
   * 增加默认页面
   * @param defaultTabDatas
   */
  const addDefaultTabs = (defaultTabDatas: DefaultTabData[]) => {
    for (const item of defaultTabDatas) {
      const id = item.id || ulid()
      const __tab = encodeTabid({
        id,
        name: item.name,
        closable: item.closable
      })
      const config = defu(item, { id, iframe: false, to: { query: { __tab } } })
      tabItems.set(config.id, new Stack<PageRouteLocationRaw>())
      const cacheName = getPageId(config.id, config.to.path, config.to.query)
      tabItems.get(config.id)?.push({
        pId: cacheName,
        path: config.to.path,
        query: config.to.query
      })
      tabs.value.push({
        id: config.id,
        title: config.name,
        closable: config.closable,
        type: config.iframe ? ContainerType.IFRAME : ContainerType.PAGE,
        url: decodeURIComponent(config.src as string),
        active: false
      })
      caches.value.push(cacheName)
    }

    const tempTab = window.sessionStorage.getItem('tab')
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
      const saveItems = new Stack<PageRouteLocationRaw>()
      saveItems.setItems(temp.items)
      tabItems.set(temp.tab.id, saveItems)
    }
  }
  const addDefault = (defaultTabDatas: DefaultTabData[]) => {
    defaultTabs.push(...defaultTabDatas)
    addDefaultTabs(defaultTabDatas)
  }

  /**
   * 返回
   * @param id
   * @param to
   * @param query
   */
  const backward = (id: string, to: number | string, query?: Object) => {
    routerAlive.value = false
    routerLeaved.value = false
    const tabStack = tabItems.get(id)
    let absTo = 0
    if (typeof to === 'number') {
      absTo = Math.abs(to)
    } else {
      let index = 1
      let hasPath = false
      const pageItems = tabStack!.values()
      for (let i = tabStack!.size() - 2; i >= 0; i--) {
        if (pageItems[i].path === to) {
          hasPath = true
          break
        }
        index += 1
      }
      if (hasPath) {
        absTo = index
      }
    }

    if (absTo === 0 || tabStack!.size() <= absTo) {
      return
    }
    // const removeCaches = new Set()
    for (let i = 0; i < absTo; i++) {
      const popRoute = tabStack?.pop()
      components.delete(popRoute!.pId)
      deletable.add(popRoute!.pId)
    }
    // 删除缓存
    // 统一删除 ，这里不处理
    // for (let i = caches.value.length - 1; i >= 0; i--) {
    //   if (removeCaches.has(caches.value[i])) {
    //     caches.value.splice(i, 1)
    //   }
    // }
    const pageRoute = tabStack?.peek()
    const component = components.get(pageRoute!.pId)
    if (component !== null && component !== undefined) {
      const sourceComponent = component.components.DynamicComponent
      sourceComponent.props = defu(query, sourceComponent.props)
    }
    // sourceComponent.props.isRefresh = 'Y'
    // components.set(
    //   pageRoute!.pId,
    //   defineComponent({
    //     name: pageRoute!.pId,
    //     components: {
    //       DynamicComponent: sourceComponent
    //     },
    //     setup() {
    //       onUnmounted(() => {
    //         // setTimeout(() => {
    //         //   routerAlive.value = true
    //         // }, 300)
    //       })
    //       return () => (
    //         <div class="cache-page-wrapper">
    //           <dynamic-component tId={id} pId={pageRoute!.pId} vBind={query} />
    //         </div>
    //       )
    //     }
    //   })
    // )
    router.push({
      path: pageRoute!.path,
      query: pageRoute!.query
    })
    setTemplate(id)
  }
  // if (defaultTabs) {
  //   addDefault(defaultTabs)
  // }
  const reset = () => {
    closeAll()
    // if (defaultTabs.length > 0) {
    //   addDefaultTabs(defaultTabs)
    //   active(defaultTabs[0].id)
    // }
  }

  const clearTabData = () => {
    tabs.value.splice(0)
    caches.value.splice(0)
    components.clear()
    tabItems.clear()
    deletable.clear()
    // window.sessionStorage.removeItem('tabItems')
    window.sessionStorage.removeItem('tab')
  }
  return {
    routerAlive,
    routerLeaved,
    removeCache,
    close,
    closeAll,
    refresh,
    refreshAll,
    closeLeft,
    closeRight,
    closeOthers,
    active,
    addTab,
    addDefault,
    caches,
    tabs,
    clearTabData,
    reset,
    backward
  }
}
