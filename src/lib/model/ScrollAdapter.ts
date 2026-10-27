/**
 * 自定义滚动容器适配器契约。
 *
 * 宿主通过 `<VueStackTabs :page-scroll="...">` 传入自己的滚动组件后，
 * 库通过组件 `expose` 的对象读取下面这组能力，把滚动位置记忆与上下阴影
 * 作用到真实的滚动元素上：
 *
 * - 只暴露 `scrollElement`：适用于所有「原生 scrollTop 驱动、只替换滚动条外观」
 *   的组件（Element Plus `ElScrollbar`、OverlayScrollbars、SimpleBar 等）；
 * - 额外实现 `getPosition` / `setPosition` / `getMetrics` / `onScroll`：
 *   适用于 BetterScroll、虚拟滚动等不产生原生滚动的实现。
 *
 * 所有可选项缺失时都会回退到原生 `scrollElement` 的相应属性，再缺失则
 * 视为该能力不可用（例如关闭阴影），不会抛错。
 */
export interface StackTabsScrollPosition {
  top: number
  left: number
}

export interface StackTabsScrollMetrics {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export interface StackTabsScrollAdapter {
  /**
   * 真实滚动元素。原生滚动型组件只需暴露这一个字段。
   * 命令式滚动组件（无原生滚动）可以不提供，改由下面可选方法承载。
   */
  scrollElement?: HTMLElement | null
  /** 读取滚动位置；缺失时读取 `scrollElement.scrollTop / scrollLeft`。 */
  getPosition?: () => StackTabsScrollPosition | null | undefined
  /** 写入滚动位置；缺失时写入 `scrollElement.scrollTop / scrollLeft`。 */
  setPosition?: (position: StackTabsScrollPosition) => void
  /** 阴影计算所需的滚动尺寸；缺失时读取 `scrollElement` 的原生属性。 */
  getMetrics?: () => StackTabsScrollMetrics | null | undefined
  /** 订阅滚动；返回取消订阅函数。缺失时监听 `scrollElement` 的 scroll 事件。 */
  onScroll?: (listener: () => void) => () => void
}

/**
 * 窄类型：只实现原生滚动元素暴露的适配器。
 * 宿主可以只实现它，不必被可选方法干扰。
 */
export type StackTabsScrollElementInstance = Pick<StackTabsScrollAdapter, 'scrollElement'>

const isScrollElement = (value: unknown): value is HTMLElement =>
  typeof HTMLElement !== 'undefined' && value instanceof HTMLElement

/** 解包 ref / getter 形式的 `scrollElement`，兼容 `defineExpose({ scrollElement: computed(...) })`。 */
const unwrapScrollElement = (value: unknown): HTMLElement | null => {
  if (!value) return null
  if (isScrollElement(value)) return value
  if (typeof value === 'function') return unwrapScrollElement((value as () => unknown)())
  const nested = (value as { value?: unknown }).value
  return isScrollElement(nested) ? nested : null
}

const toFiniteNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

const normalizePosition = (
  position: StackTabsScrollPosition | null | undefined
): StackTabsScrollPosition | null => {
  if (!position) return null
  return { top: toFiniteNumber(position.top), left: toFiniteNumber(position.left) }
}

/**
 * 把自定义滚动组件的 `expose` 实例归一化为适配器。
 *
 * - 直接传 HTMLElement 时把它当作 `scrollElement`；
 * - 实例上的方法以实例为 this 调用；
 * - 完全没有可用能力时返回 null，调用方按「没有自定义滚动容器」降级。
 */
export const resolveScrollAdapter = (instance: unknown): StackTabsScrollAdapter | null => {
  if (instance == null) return null
  if (isScrollElement(instance)) return { scrollElement: instance }

  const source = instance as Record<string, unknown>
  const scrollElement = unwrapScrollElement(source.scrollElement)

  const getPosition =
    typeof source.getPosition === 'function'
      ? () =>
          normalizePosition(
            (
              source.getPosition as (this: unknown) => StackTabsScrollPosition | null | undefined
            ).call(instance)
          )
      : undefined

  const setPosition =
    typeof source.setPosition === 'function'
      ? (position: StackTabsScrollPosition) => {
          ;(source.setPosition as (this: unknown, value: StackTabsScrollPosition) => void).call(
            instance,
            position
          )
        }
      : undefined

  const getMetrics =
    typeof source.getMetrics === 'function'
      ? (): StackTabsScrollMetrics | null => {
          const metrics = (
            source.getMetrics as (this: unknown) => StackTabsScrollMetrics | null | undefined
          ).call(instance)
          if (!metrics) return null
          return {
            scrollTop: toFiniteNumber(metrics.scrollTop),
            scrollHeight: toFiniteNumber(metrics.scrollHeight),
            clientHeight: toFiniteNumber(metrics.clientHeight)
          }
        }
      : undefined

  const onScroll =
    typeof source.onScroll === 'function'
      ? (listener: () => void): (() => void) => {
          const cleanup = (
            source.onScroll as (this: unknown, callback: () => void) => unknown
          ).call(instance, listener)
          return typeof cleanup === 'function' ? (cleanup as () => void) : () => undefined
        }
      : undefined

  if (!scrollElement && !getPosition && !setPosition && !getMetrics && !onScroll) return null

  return { scrollElement, getPosition, setPosition, getMetrics, onScroll }
}

/** 适配器是否至少具备一种位置读写能力。 */
export const canReadScrollPosition = (adapter: StackTabsScrollAdapter | null): boolean =>
  Boolean(adapter && (adapter.getPosition || adapter.scrollElement))

/** 读取适配器位置：优先 `getPosition`，缺失时回退原生 `scrollTop / scrollLeft`。 */
export const readAdapterScrollPosition = (
  adapter: StackTabsScrollAdapter | null
): StackTabsScrollPosition | null => {
  if (!adapter) return null
  if (adapter.getPosition) return normalizePosition(adapter.getPosition())
  const element = adapter.scrollElement
  if (!element) return null
  return { top: element.scrollTop, left: element.scrollLeft }
}

/** 写入适配器位置：优先 `setPosition`，缺失时回退原生 `scrollTop / scrollLeft`。 */
export const writeAdapterScrollPosition = (
  adapter: StackTabsScrollAdapter | null,
  position: StackTabsScrollPosition
): boolean => {
  if (!adapter) return false
  if (adapter.setPosition) {
    adapter.setPosition(position)
    return true
  }
  const element = adapter.scrollElement
  if (!element) return false
  element.scrollTop = position.top
  element.scrollLeft = position.left
  return true
}

/** 读取阴影所需尺寸：优先 `getMetrics`，缺失时读取 `scrollElement` 原生属性。 */
export const readAdapterScrollMetrics = (
  adapter: StackTabsScrollAdapter | null
): StackTabsScrollMetrics | null => {
  if (!adapter) return null
  const metrics = adapter.getMetrics?.()
  if (metrics) {
    return {
      scrollTop: toFiniteNumber(metrics.scrollTop),
      scrollHeight: toFiniteNumber(metrics.scrollHeight),
      clientHeight: toFiniteNumber(metrics.clientHeight)
    }
  }
  const element = adapter.scrollElement
  if (!element) return null
  return {
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight
  }
}
