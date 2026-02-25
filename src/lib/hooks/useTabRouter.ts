import { defu } from 'defu'
import { getCurrentInstance } from 'vue'
import type { ComponentInternalInstance } from 'vue'
import type { RouteLocationPathRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import useTabPanel from './useTabPanel'
import { parseUrl } from '../utils/urlParser'
import { useTabEmitter } from './useTabEventBus'

import { createPageId } from '../utils/tabInfoEncoder'

/** StackTabs 监听此事件切换前进动画 */
const ROUTER_EVENT_FORWARD = 'FORWARD'
/** StackTabs 监听此事件切换后退动画 */
const ROUTER_EVENT_BACKWARD = 'BACKWARD'

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
  const { getTab, evictPageCache, addPageScroller } = useTabPanel()

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

  /**
   * 前进：将新路由推入该标签的 pages 栈，并触发前进动画。
   *
   * 实现细节：
   * 1. 通过 defu 将 __tab 合并进 query，确保目标页面也携带正确的标签标识
   *    （用户传入的 to.query 优先级更高，__tab 作为默认补全）
   * 2. 发出 FORWARD 事件，StackTabs 切换为前进方向的转场动画
   * 3. router.push 触发路由变更，StackTabs 的 tabWrapper → updatePageState
   *    会在下次渲染时把目标页面压入 tab.pages 栈
   */
  const forward = (to: RouteLocationPathRaw) => {
    const tab = getTab(tabId)
    const targetQuery = (to.query || {}) as Record<string, string>

    if (tab) {
      // 【核心重构：数据前置压栈】
      // 生成崭新独立的 CacheName，并推入专属页面栈
      const newPageId = createPageId()
      tab.pages.push({
        id: newPageId,
        tabId: tab.id,
        path: to.path,
        query: targetQuery
      })
    }

    const query = defu({ __tab: tabInfo }, to.query)
    emitter.emit(ROUTER_EVENT_FORWARD)
    router.push({ path: to.path, query })
  }

  /**
   * 后退：从该标签的 pages 栈中弹出若干层页面，跳转到新栈顶。
   *
   * @param to        数字 = 退几步；字符串路径 = 回退到栈中首个路径匹配的页面
   * @param backQuery 可选，回退后传递给目标页面的额外参数（目标页通过 props 接收）
   *
   * ───────────────────────────────────────────────────────
   * ⚠️  关键时序约束 — 为什么必须先导航再驱逐？
   * ───────────────────────────────────────────────────────
   * evictPageCache 会立即同步修改响应式数组 caches.value（即 <keep-alive :include>）。
   * 这个修改会触发 Vue 将 StackTabs 组件标记为 "需要重渲染"。
   *
   * 由于 router.push 是异步的（微任务队列），重渲染在 push 完成前就可能发生。
   * 此时路由对象仍然指向被退出的页面，tabWrapper 以旧路由调用 resolvePageComponent，
   * 而 components 里对应的 cacheName 已被删除 → resolvePageComponent 误判为"新页面"，
   * 立刻重建组件 + 调用 addCache 将其加回 caches。
   * 结果：驱逐了又原地复活，<keep-alive> 保留了旧实例（含用户输入状态）。
   *
   * ✅ 正确做法（本实现）：
   *   1. 仅从 pages 栈中 pop，不立即驱逐
   *   2. router.push(target) — 导航到前一页，路由切换后重渲染以新路由为基础
   *   3. .then() 回调里安全执行 evictPageCache
   *      此时旧页面已不再是"当前渲染目标"，不会被误重建
   * ───────────────────────────────────────────────────────
   */
  const backward = (to: number | string, backQuery?: Record<string, unknown>) => {
    const tab = getTab(tabId)
    if (!tab) return false

    const stack = tab.pages
    let steps = 0

    if (typeof to === 'number') {
      // 按步数退：取绝对值，防止调用方传入负数导致逻辑异常
      steps = Math.abs(to)
    } else {
      // 按路径退：从栈顶向下扫描，找第一个 path 完全匹配的历史页面
      const parsed = parseUrl(to)
      const targetQuery = parsed.query || {}
      const pages = stack.list()
      let found = false

      // 精简版的参数匹配：如果调用方指定的 to.query 为空，就只要 path 匹配即可
      // 若调用方指定了 query，则该 query 的每个键值必须在历史页面的 query 中存在且相等
      const isQueryMatch = (pageQuery?: Record<string, unknown>) => {
        const pq = { ...(pageQuery || {}) }
        const tq = { ...targetQuery }
        delete pq.__tab
        delete pq._back
        delete tq.__tab
        delete tq._back

        const tqKeys = Object.keys(tq)
        if (tqKeys.length === 0) return true // 回退意图只要路径对了即可，不管历史曾有啥参数

        return tqKeys.every((k) => String(tq[k] ?? '') === String(pq[k] ?? ''))
      }

      // 从 size-2 开始（size-1 是当前页，不算在候选范围内）
      for (let i = stack.size() - 2; i >= 0; i--) {
        steps++
        const page = pages[i]
        const isSamePath = page?.path === parsed.path
        const isSameQuery = isQueryMatch(page?.query)
        console.log(
          `[vue-stack-tabs backward] Checking pop candidate ${i}: path=${page?.path}, isSamePath=${isSamePath}, isSameQuery=${isSameQuery}`
        )
        if (isSamePath && isSameQuery) {
          found = true
          break
        }
      }
      // 栈中找不到目标路径，无法后退，返回警告
      if (!found) {
        console.warn(
          `[vue-stack-tabs] backward failed: target url '${to}' not found in history stack. Current stack: `,
          JSON.parse(JSON.stringify(pages))
        )
        return false
      }
    }

    // 边界保护：
    // - steps <= 0：无效步数，不操作
    if (steps <= 0) return false

    // - stack.size() <= steps：栈深不足，如果步数超限，最多只能退到首页（即首个页面，清空其他）。
    if (stack.size() <= steps) {
      steps = stack.size() - 1 // 保留最后一层（首个推入的根页面）
    }

    // 若修复后退之后步数仍为0，说明已经在根页面无可后退
    if (steps <= 0) return false

    // 阶段 1：仅从 pages 栈弹出，收集 ID 入回收站
    // （keep-alive 驱逐推迟到导航完成后，这就相当于您的回收站概念）
    const recyclingBin: string[] = []
    for (let i = 0; i < steps; i++) {
      const popped = stack.pop()
      if (popped) recyclingBin.push(popped.id)
    }

    // 弹出后，栈顶即为目标回退页
    const target = stack.peek()
    if (!target) return false

    if (backQuery) {
      // 按照需求，将回退参数挂载在 _backParams 这个只活在页表栈的内存变量上
      // 绝对隔离与不再污染真实 route.query 和 URL 跳转。
      target._backParams = backQuery
    }

    emitter.emit(ROUTER_EVENT_BACKWARD)

    // 阶段 2：先导航，再清理回收站
    // 对于 targetQuery 只需要带一个能够给框架定锚的 __tab。其他参数其实已经在 target.query 里。
    const targetQueryWithTab = defu({ __tab: tabInfo }, target.query || {})

    // 用编程式导航发起回退路由
    router.push({ path: target.path, query: targetQueryWithTab }).then(() => {
      // 导航完成且微任务结束后，说明新目标已稳坐栈顶，此时清理回收站安全
      for (const id of recyclingBin) {
        evictPageCache(id)
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
