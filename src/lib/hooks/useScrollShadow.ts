/**
 * useScrollShadow - 为可滚动容器动态切换上下阴影类。
 *
 * 职责：在 scroll 事件触发时根据 scrollTop / scrollHeight 边界，
 *       给目标元素动态加上/移除 stack-tab__shadow-inset-top / -bottom 类，
 *       距离边界 > 阈值时显示阴影（提示用户"还能往这个方向滚"），
 *       已贴边（距离边界 ≤ 阈值）时隐藏阴影，避免到顶/到底后阴影残留误导。
 *
 * 设计要点：
 *  - 使用 passive scroll 监听，不阻塞滚动
 *  - 使用 ResizeObserver 监视子页面缩放/尺寸变化，重新计算阴影边界
 *  - 使用 rAF 节流，避免一帧内多次写 class
 *  - 阈值（默认 5px）内视为已贴边（≤ 阈值）→ 隐藏阴影；超过阈值视为可继续滚动 → 显示阴影
 *  - SSR 安全：在 document 不存在时直接返回
 *  - 自动清理：onScopeDispose 移除监听并取消 rAF/disconnect observer
 */
import { onScopeDispose, type Ref } from 'vue'

const SHADOW_TOP_CLASS = 'stack-tab__shadow-inset-top'
const SHADOW_BOTTOM_CLASS = 'stack-tab__shadow-inset-bottom'
const SHADOW_VERTICAL_CLASS = 'stack-tab__shadow-inset-vertical'
const DEFAULT_EDGE_THRESHOLD = 5

export interface UseScrollShadowOptions {
  /** 容器元素的 ref，可以是 Ref<HTMLElement | null> 或 getter 函数 */
  target: Ref<HTMLElement | null> | (() => HTMLElement | null)
  /**
   * 是否监听内容缩放/尺寸变化（默认 true）。
   * 启用后会用 ResizeObserver 监视目标尺寸，容器或子树尺寸变化都会重新计算阴影边界。
   */
  watchResize?: boolean
  /**
   * 到顶/到底的判定阈值（px，默认 5）。
   * 距离边界 ≤ 阈值视为已贴边（不显示阴影）；距离边界 > 阈值视为可继续滚动（显示阴影）。
   */
  edgeThreshold?: number
}

export interface UseScrollShadowReturn {
  /** 手动同步一次（用于内容变化/resize 后） */
  sync: () => void
}

const resolveTarget = (
  target: Ref<HTMLElement | null> | (() => HTMLElement | null)
): HTMLElement | null => (typeof target === 'function' ? target() : target.value)

export const useScrollShadow = (options: UseScrollShadowOptions): UseScrollShadowReturn => {
  if (typeof document === 'undefined') {
    return { sync: () => undefined }
  }

  const watchResize = options.watchResize !== false
  const edgeThreshold = Math.max(0, options.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD)
  let rafId: number | null = null
  let attached: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null

  const recompute = (): void => {
    if (!attached) return
    const target = attached
    const { scrollTop, scrollHeight, clientHeight } = target
    const distanceToTop = scrollTop
    const distanceToBottom = scrollHeight - clientHeight - scrollTop
    // 顶部阴影：表示上方还有内容，离开顶部（距离顶部 > 阈值）时显示。
    // 底部阴影：表示下方还有内容，离开底部（距离底部 > 阈值）时显示。
    const showTopShadow = distanceToTop > edgeThreshold
    const showBottomShadow = distanceToBottom > edgeThreshold
    // 注意：-top / -bottom 是两个独立 CSS 规则、作用在同一个 ::after 上，
    // 同时加会互相覆盖（后定义的 -bottom 胜出）。因此这里互斥地只加一个类：
    // 两侧都有内容用 -vertical，只有一侧用 -top / -bottom，贴边时都不加。
    target.classList.toggle(
      SHADOW_VERTICAL_CLASS,
      showTopShadow && showBottomShadow
    )
    target.classList.toggle(SHADOW_TOP_CLASS, showTopShadow && !showBottomShadow)
    target.classList.toggle(SHADOW_BOTTOM_CLASS, !showTopShadow && showBottomShadow)
  }

  const schedule = (): void => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      recompute()
    })
  }

  const attach = (): void => {
    const el = resolveTarget(options.target)
    if (!el || el === attached) return
    if (attached) {
      attached.removeEventListener('scroll', schedule)
      resizeObserver?.disconnect()
      resizeObserver = null
    }
    attached = el
    el.addEventListener('scroll', schedule, { passive: true })
    if (watchResize && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => schedule())
      resizeObserver.observe(el)
    }
    schedule()
  }

  const detach = (): void => {
    if (attached) {
      attached.removeEventListener('scroll', schedule)
      attached.classList.remove(
        SHADOW_TOP_CLASS,
        SHADOW_BOTTOM_CLASS,
        SHADOW_VERTICAL_CLASS
      )
      attached = null
    }
    resizeObserver?.disconnect()
    resizeObserver = null
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  // 初始挂载（target 可能是异步插入的 DOM，使用 microtask 等一帧）
  queueMicrotask(attach)

  onScopeDispose(detach)

  return {
    sync: () => schedule()
  }
}
