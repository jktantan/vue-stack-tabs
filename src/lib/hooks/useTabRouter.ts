import { defu } from 'defu'
import { getCurrentInstance } from 'vue'
import type { ComponentInternalInstance } from 'vue'
import type { LocationQueryRaw, RouteLocationPathRaw } from 'vue-router'
import type { ITabPage } from '../model/TabModel'
import { isNavigationFailure, useRoute, useRouter } from 'vue-router'

import useTabPanel from './useTabPanel'
import {
  parseUrl,
  cloneLocationQuery,
  clonePage,
  isSameQueryIgnoringReserved
} from '../utils/urlParser'
import { TabEventType, useTabEmitter } from './useTabEventBus'

import { runNavigationTransaction } from './tabPanel/navigationTransaction'

import { createPageId } from '../utils/tabInfoEncoder'

interface PageStackLike {
  clear: () => void
  push: (page: ITabPage) => void
}

const restorePages = (stack: PageStackLike, pages: ITabPage[]) => {
  stack.clear()
  for (const page of pages) {
    stack.push(clonePage(page))
  }
}

/**
 * useTabRouter - 标签内路由 Hook
 *
 * 职责：在单个标签内实现「前进/后退」栈式导航，以及滚动位置的记录与恢复
 * 使用范围：仅在标签内的页面组件中使用，依赖 StackTabs 通过 cloneVNode 注入的 tId / pId
 *
 * 主要 API：
 * - forward(to)             前进：push 新页面到该标签的 pages 栈
 * - backward(to, backQuery) 后退：pop 栈顶、驱逐缓存，跳转到新栈顶
 * - addScrollTarget(...)    注册需要记录滚动位置的选择器
 */
export default function useTabRouter() {
  const instance = getCurrentInstance() as ComponentInternalInstance
  const { attrs, props } = instance

  /**
   * 当前标签 ID。
   * StackTabs 在 StackTabs.vue 的 tabWrapper 里通过 cloneVNode(Node, { tId, pId }) 注入，
   * 未在子组件 setup 中声明为 prop 的属性会落入 attrs，
   * 因此优先读 attrs.tId，再 fallback 到 props.tId。
   */
  const tabId = (attrs.tId ?? props.tId) as string

  /**
   * 当前页面的缓存 ID（即 cacheName / keep-alive include 中的名称）。
   * 用于 addScrollTarget 向 useTabPanel 绑定该页面的可滚动容器选择器。
   */
  const pageId = (attrs.pId ?? props.pId) as string

  const route = useRoute()
  const router = useRouter()
  const emitter = useTabEmitter()
  const { getTab, evictPageCache, addPageScroller, active: activateTab } = useTabPanel()

  /**
   * 当前标签的编码信息字符串，存于 URL query.__tab。
   * 每次 forward 时必须将此值一并带入新页面的 query，
   * 确保 StackTabs 在 updatePageState 解析路由时能识别该请求归属于哪个标签，
   * 而不是错误地新建一个陌生标签。
   */
  const tabInfo = route.query.__tab as string

  /** 注册需记录滚动位置的容器选择器，供 useTabPanel 在 deactivated/activated 时保存/恢复 */
  const addScrollTarget = (...selectors: string[]) => {
    addPageScroller(pageId, ...selectors)
  }

  let navigationVersion = 0

  /**
   * 前进：将新路由推入该标签的 pages 栈，并触发前进动画。
   */
  const forward = (to: RouteLocationPathRaw) => {
    const tab = getTab(tabId)
    const targetQuery = (to.query || {}) as LocationQueryRaw

    if (tab) {
      const top = tab.pages.peek()
      if (top && top.path === to.path) {
        if (isSameQueryIgnoringReserved(targetQuery, top.query || {})) {
          if (!tab.active) {
            activateTab(tab.id)
          }
          return
        }
      }
    }

    const query = defu({ __tab: tabInfo }, to.query)
    const transactionVersion = ++navigationVersion
    emitter.emit(TabEventType.FORWARD)

    let optimisticPageId = ''
    runNavigationTransaction({
      apply: () => {
        const snapshot = tab ? tab.pages.readonlyList().map((p) => clonePage(p)) : []
        if (tab) {
          optimisticPageId = createPageId()
          tab.pages.push({
            id: optimisticPageId,
            tabId: tab.id,
            path: to.path,
            query: cloneLocationQuery(targetQuery)
          })
        }
        return snapshot
      },
      navigate: () => router.push({ path: to.path, query }),
      rollback: (snapshot) => {
        if (tab) restorePages(tab.pages, snapshot)
      },
      isFailureResult: isNavigationFailure,
      isCurrent: () => navigationVersion === transactionVersion,
      cleanupStale: () => {
        if (!tab || !optimisticPageId) return
        const pages = tab.pages.list().filter((page) => page.id !== optimisticPageId)
        restorePages(tab.pages, pages)
      }
    }).catch((error: unknown) => {
      if (!import.meta.env.PROD) {
        console.warn('[vue-stack-tabs] forward navigation failed:', error)
      }
    })
  }

  /**
   * 后退：从该标签的 pages 栈中弹出若干层页面，跳转到新栈顶。
   *
   * @param to        数字 = 退几步；字符串路径 = 回退到栈中首个路径匹配的页面
   * @param backQuery 可选，回退后传递给目标页面的额外参数（目标页通过 props 接收）
   *
   * ⚠️ 关键时序约束 — 必须先导航再驱逐（详见原注释）
   */
  const backward = (to: number | string, backQuery?: Record<string, unknown>) => {
    const tab = getTab(tabId)
    if (!tab) return false

    const stack = tab.pages
    let steps = 0

    if (typeof to === 'number') {
      steps = Math.abs(to)
    } else {
      const parsed = parseUrl(to)
      const targetQuery = parsed.query || {}
      const pages = stack.readonlyList()
      let found = false

      for (let i = stack.size() - 2; i >= 0; i--) {
        steps++
        const page = pages[i]
        if (
          page?.path === parsed.path &&
          isSameQueryIgnoringReserved(targetQuery, page?.query || {})
        ) {
          found = true
          break
        }
      }
      if (!found) {
        if (!import.meta.env.PROD) {
          console.warn(
            `[vue-stack-tabs] backward failed: target url '${to}' not found in history stack. Current stack: `,
            JSON.parse(JSON.stringify(pages))
          )
        }
        return false
      }
    }

    if (steps <= 0) return false

    if (stack.size() <= steps) {
      steps = stack.size() - 1
    }

    if (steps <= 0) return false

    const originalPages = stack.readonlyList().map((p) => clonePage(p))
    const recyclingBin: string[] = []
    for (let i = 0; i < steps; i++) {
      const popped = stack.pop()
      if (popped) recyclingBin.push(popped.id)
    }

    const target = stack.peek()
    if (!target) {
      restorePages(stack, originalPages)
      return false
    }

    if (backQuery) {
      target._backParams = backQuery
    }

    emitter.emit(TabEventType.BACKWARD)

    const targetQueryWithTab = defu({ __tab: tabInfo }, target.query || {})
    const transactionVersion = ++navigationVersion

    runNavigationTransaction({
      apply: () => originalPages,
      navigate: () => router.push({ path: target.path, query: targetQueryWithTab }),
      rollback: (snapshot) => restorePages(stack, snapshot),
      isFailureResult: isNavigationFailure,
      isCurrent: () => navigationVersion === transactionVersion,
      commit: () => {
        for (const id of recyclingBin) {
          evictPageCache(id)
        }
      },
      cleanupStale: () => {
        const activePageIds = new Set(stack.list().map((page) => page.id))
        for (const id of recyclingBin) {
          if (!activePageIds.has(id)) evictPageCache(id)
        }
      }
    }).catch((error: unknown) => {
      if (!import.meta.env.PROD) {
        console.warn('[vue-stack-tabs] backward navigation failed:', error)
      }
    })
    return true
  }

  return {
    forward,
    backward,
    addScrollTarget
  }
}
