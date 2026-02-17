import { defu } from 'defu'
import { getCurrentInstance } from 'vue'
import type { ComponentInternalInstance } from 'vue'
import type { RouteLocationPathRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import useTabPanel from './useTabPanel'
import { parseUrl } from '../utils/urlParser'
import { useTabEmitter } from './useTabEventBus'

/** StackTabs 监听此事件切换前进动画 */
const ROUTER_EVENT_FORWARD = 'FORWARD'
/** StackTabs 监听此事件切换后退动画 */
const ROUTER_EVENT_BACKWARD = 'BACKWARD'

/**
 * useTabRouter - 标签内路由 Hook
 *
 * 职责：在单个标签内实现「前进/后退」栈式导航，以及滚动位置的记录与恢复
 * 使用范围：仅在标签内的页面组件中使用，依赖 router-view 传入的 tId、pId
 *
 * 主要 API：
 * - forward(to) 前进：push 新页面到该标签的 pages 栈
 * - backward(to, backQuery?) 后退：pop 栈顶、markCacheForEviction，跳转到新栈顶
 * - addScrollTarget(...selectors) 注册需要记录滚动位置的选择器
 */
export default function useTabRouter() {
  const instance = getCurrentInstance() as ComponentInternalInstance
  const { attrs, props } = instance
  /** 当前标签 id，由 cache 组件的 dynamic-component 传入 */
  const tabId = (attrs.tId ?? props.tId) as string
  /** 当前页面缓存 id */
  const pageId = (attrs.pId ?? props.pId) as string

  const route = useRoute()
  const router = useRouter()
  const emitter = useTabEmitter()
  const { getTab, markCacheForEviction, getComponent, addPageScroller } = useTabPanel()

  /** 当前标签的编码信息，用于 push 时保持 __tab */
  const tabInfo = route.query.__tab as string

  /** 注册需记录滚动位置的容器选择器 */
  const addScrollTarget = (...selectors: string[]) => {
    addPageScroller(pageId, ...selectors)
  }

  /** 前进：进栈，跳转到新页面 */
  const forward = (to: RouteLocationPathRaw) => {
    const query = defu({ __tab: tabInfo }, to.query)
    emitter.emit(ROUTER_EVENT_FORWARD)
    router.push({ path: to.path, query })
  }

  /**
   * 后退：从该标签的 pages 栈中 pop，并跳转到新栈顶
   * @param to 数字=退几步，字符串=回退到首个路径匹配的页面
   * @param backQuery 回退后传给目标页面的 props 数据（目标页通过 props 接收）
   */
  const backward = (to: number | string, backQuery?: object) => {
    const tab = getTab(tabId)
    if (!tab) return

    const stack = tab.pages
    let steps = 0

    if (typeof to === 'number') {
      steps = Math.abs(to)
    } else {
      const parsed = parseUrl(to)
      backQuery = defu(parsed.query, backQuery)
      const pages = stack.list()
      let found = false
      for (let i = stack.size() - 2; i >= 0; i--) {
        steps++
        if (pages[i]?.path === parsed.path) {
          found = true
          break
        }
      }
      if (!found) return
    }

    if (steps <= 0 || stack.size() <= steps) return

    for (let i = 0; i < steps; i++) {
      const popped = stack.pop()
      if (popped) markCacheForEviction(popped.id)
    }

    const target = stack.peek()
    if (!target) return

    const component = getComponent(target.id)
    if (component && backQuery) {
      const comp = component as {
        components?: { DynamicComponent?: { props?: object } }
      }
      const dynamic = comp.components?.DynamicComponent
      if (dynamic?.props) {
        dynamic.props = defu(backQuery, dynamic.props)
      }
    }

    emitter.emit(ROUTER_EVENT_BACKWARD)
    router.push({ path: target.path, query: target.query })
  }

  return {
    forward,
    backward,
    addScrollTarget
  }
}
