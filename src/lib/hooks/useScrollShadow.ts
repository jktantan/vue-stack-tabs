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
 *  - 阴影类可以挂到另一个不参与 transform 的元素上：滚动容器的 ::after 一旦
 *    跟随 transform（例如页面刷新动画），绝对定位的包含块就会变化，阴影会错位/消失
 */
import { onScopeDispose, type Ref } from 'vue'

const SHADOW_TOP_CLASS = 'stack-tab__shadow-inset-top'
const SHADOW_BOTTOM_CLASS = 'stack-tab__shadow-inset-bottom'
const SHADOW_VERTICAL_CLASS = 'stack-tab__shadow-inset-vertical'
const DEFAULT_EDGE_THRESHOLD = 5

export interface UseScrollShadowOptions {
  /** 滚动容器：用于监听 scroll / resize 并读取滚动尺寸 */
  target: Ref<HTMLElement | null> | (() => HTMLElement | null)
  /**
   * 阴影类挂载目标，默认与 target 相同。
   * 当 target 参与 transform 动画（如刷新转场）时，应传入不参与动画的祖先
   * （例如 .stack-tab__keep-alive-panel），否则 ::after 的绝对定位包含块会变化，
   * 阴影会随动画错位或消失。
   */
  classTarget?: Ref<HTMLElement | null> | (() => HTMLElement | null)
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
  /**
   * 自定义尺寸读取（可选）。提供时优先于 `target` 的原生
   * `scrollTop / scrollHeight / clientHeight`，用于命令式滚动组件。
   */
  getMetrics?: () => { scrollTop: number; scrollHeight: number; clientHeight: number } | null
  /**
   * 自定义滚动订阅（可选）。提供时优先于在 `target` 上监听 scroll 事件，
   * 返回取消订阅函数。`target` 可以为 null（例如纯 transform 驱动的滚动组件）。
   */
  onScroll?: (listener: () => void) => () => void
}

export interface UseScrollShadowReturn {
  /**
   * 重新解析滚动/阴影目标并同步一次（用于 keep-alive 激活、DOM 重新挂载后）。
   * `force` 为 true 时即使 target 未变化也重建订阅，用于适配器内部状态
   * （自定义滚动元素的 expose）在两次 sync 之间发生变化的场景。
   */
  sync: (force?: boolean) => void
  /** 移除阴影类并取消待执行的 rAF（用于 keep-alive 失活） */
  clear: () => void
}

const resolveTarget = (
  target: Ref<HTMLElement | null> | (() => HTMLElement | null)
): HTMLElement | null => (typeof target === 'function' ? target() : target.value)

export const useScrollShadow = (options: UseScrollShadowOptions): UseScrollShadowReturn => {
  if (typeof document === 'undefined') {
    return { sync: () => undefined, clear: () => undefined }
  }

  const watchResize = options.watchResize !== false
  const edgeThreshold = Math.max(0, options.edgeThreshold ?? DEFAULT_EDGE_THRESHOLD)
  let rafId: number | null = null
  let attached: HTMLElement | null = null
  let attachedOnScroll: ((listener: () => void) => () => void) | null = null
  let scrollCleanup: (() => void) | null = null
  let classElement: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null

  const clearClasses = (element: HTMLElement | null): void => {
    if (!element) return
    element.classList.remove(SHADOW_TOP_CLASS, SHADOW_BOTTOM_CLASS, SHADOW_VERTICAL_CLASS)
  }

  /** 阴影类目标：配置了 classTarget 时必须真实解析到，否则宁可不显示（激活后会 sync 重试） */
  const resolveClassTarget = (): HTMLElement | null =>
    options.classTarget ? resolveTarget(options.classTarget) : attached

  const recompute = (): void => {
    // 命令式滚动组件可能没有原生滚动元素，但通过 getMetrics 提供尺寸。
    if (!attached && !options.getMetrics) return
    const nextClassTarget = resolveClassTarget()
    if (classElement && classElement !== nextClassTarget) {
      clearClasses(classElement)
      classElement = null
    }
    classElement = nextClassTarget
    if (!classElement) return

    // 自定义尺寸优先；返回 null 时回退到原生滚动元素。
    const metrics =
      options.getMetrics?.() ??
      (attached
        ? {
            scrollTop: attached.scrollTop,
            scrollHeight: attached.scrollHeight,
            clientHeight: attached.clientHeight
          }
        : null)
    if (!metrics) return

    const { scrollTop, scrollHeight, clientHeight } = metrics
    const distanceToTop = scrollTop
    const distanceToBottom = scrollHeight - clientHeight - scrollTop
    // 顶部阴影：表示上方还有内容，离开顶部（距离顶部 > 阈值）时显示。
    // 底部阴影：表示下方还有内容，离开底部（距离底部 > 阈值）时显示。
    const showTopShadow = distanceToTop > edgeThreshold
    const showBottomShadow = distanceToBottom > edgeThreshold
    // 注意：-top / -bottom 是两个独立 CSS 规则、作用在同一个 ::after 上，
    // 同时加会互相覆盖（后定义的 -bottom 胜出）。因此这里互斥地只加一个类：
    // 两侧都有内容用 -vertical，只有一侧用 -top / -bottom，贴边时都不加。
    classElement.classList.toggle(SHADOW_VERTICAL_CLASS, showTopShadow && showBottomShadow)
    classElement.classList.toggle(SHADOW_TOP_CLASS, showTopShadow && !showBottomShadow)
    classElement.classList.toggle(SHADOW_BOTTOM_CLASS, !showTopShadow && showBottomShadow)
  }

  const schedule = (): void => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      recompute()
    })
  }

  /** 释放滚动事件订阅 / ResizeObserver，不清理阴影类。 */
  const releaseScrollSource = (): void => {
    if (attached) attached.removeEventListener('scroll', schedule)
    if (scrollCleanup) {
      scrollCleanup()
      scrollCleanup = null
    }
    attachedOnScroll = null
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  const attach = (force = false): void => {
    const el = resolveTarget(options.target)
    const onScroll = options.onScroll ?? null
    if (!el && !onScroll && !options.getMetrics) return
    if (!force && el === attached && onScroll === attachedOnScroll) {
      schedule()
      return
    }
    releaseScrollSource()
    clearClasses(classElement)
    classElement = null

    attached = el
    if (onScroll) {
      // 自定义滚动订阅优先于原生 scroll 事件；没有原生滚动元素时也能工作。
      attachedOnScroll = onScroll
      const cleanup = onScroll(schedule)
      scrollCleanup = typeof cleanup === 'function' ? cleanup : null
    } else if (el) {
      el.addEventListener('scroll', schedule, { passive: true })
    }
    if (watchResize && el && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => schedule())
      resizeObserver.observe(el)
    }
    schedule()
  }

  const cancelScheduled = (): void => {
    if (rafId === null) return
    cancelAnimationFrame(rafId)
    rafId = null
  }

  const clear = (): void => {
    clearClasses(classElement)
    classElement = null
    cancelScheduled()
  }

  /** 重新解析目标：keep-alive 激活或 DOM 重新挂载后由调用方触发 */
  const sync = (force = false): void => {
    const el = resolveTarget(options.target)
    const onScroll = options.onScroll ?? null
    if (!el && !onScroll && !options.getMetrics) {
      detach()
      return
    }
    if (force || el !== attached || onScroll !== attachedOnScroll) {
      attach(force)
      return
    }
    schedule()
  }

  const detach = (): void => {
    releaseScrollSource()
    attached = null
    clearClasses(classElement)
    classElement = null
    cancelScheduled()
  }

  // 初始挂载（target 可能是异步插入的 DOM，使用 microtask 等一帧）
  queueMicrotask(attach)

  onScopeDispose(detach)

  return { sync, clear }
}
