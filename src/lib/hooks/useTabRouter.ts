import { defu } from 'defu'

import { getCurrentInstance } from 'vue'
import type { ComponentInternalInstance } from 'vue'
import { type RouteLocationPathRaw, useRoute, useRouter } from 'vue-router'

import useTabpanel from '@/lib/hooks/useTabpanel'
import { uriDecode } from '@/lib/utils/UriHelper'
export default () => {
  const { attrs, props } = getCurrentInstance() as ComponentInternalInstance
  const { pageShown, getTab, markDeletableCache, removeComponent, getComponent, addPageScroller } =
    useTabpanel()
  const route = useRoute()
  const router = useRouter()
  let currentId = ''
  // const currentPageId = ''
  let currentTab = ''
  currentId = (attrs.tId || props.tId) as string
  const currentPageId = (attrs.pId || props.pId) as string
  // currentPageId = attrs.pId as string
  currentTab = route.query.__tab as string

  const addScroller = (...scroller: string[]) => {
    addPageScroller(currentPageId, ...scroller)
  }
  const forward = (to: RouteLocationPathRaw) => {
    pageShown.value = false
    const query = defu(
      {
        __tab: currentTab
      },
      to.query
    )
    router.push({
      path: to.path,
      query
    })
  }
  /**
   * 返回
   * @param to url or step
   * @param query 返回时要加截的数据
   */
  const backward = (to: number | string, query?: Object) => {
    pageShown.value = false

    const tab = getTab(currentId)
    if (!tab) {
      return
    }
    const tabStack = tab.pages
    let absTo = 0
    if (typeof to === 'number') {
      absTo = Math.abs(to)
    } else {
      let index = 1
      let hasPath = false
      const pageItems = tabStack.list()
      const url = uriDecode(to)
      query = defu(url.query, query)
      for (let i = tabStack.size() - 2; i >= 0; i--) {
        if (pageItems[i].path === url.path) {
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
      const popRoute = tabStack.pop()
      removeComponent(popRoute!.id)
      markDeletableCache(popRoute!.id)
    }
    const pageRoute = tabStack?.peek()
    const component = getComponent(pageRoute!.id)
    if (component !== null && component !== undefined) {
      const sourceComponent = component.components.DynamicComponent
      sourceComponent.props = defu(query, sourceComponent.props)
    }
    router.push({
      path: pageRoute!.path,
      query: pageRoute!.query
    })
  }

  return {
    forward,
    backward,
    addScroller
  }
}
