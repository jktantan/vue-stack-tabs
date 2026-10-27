/**
 * 页面级滚动源上下文。
 *
 * `pageScroll: 'none'` 时库不会主动监听任何滚动元素。页面内组件可以通过
 * `useTabPageScroll()` 把真正的滚动元素或适配器注册进来，滚动位置记忆、
 * 阴影状态和滚动条 UI 都能继续工作。
 */
import type { InjectionKey } from 'vue'
import type { StackTabsScrollAdapter } from '../model/ScrollAdapter'

export interface TabPageScrollController {
  /**
   * 注册当前页面的主滚动源。
   *
   * 传 `HTMLElement` 时按原生 `scrollTop/scrollLeft` 读写；传适配器时支持
   * `getPosition/setPosition/getMetrics/onScroll`。传 `null` 等价于 `detach()`。
   */
  attach: (source: HTMLElement | StackTabsScrollAdapter | null) => void
  /** 取消当前页面的主滚动源，回退到页面工厂的默认策略。 */
  detach: () => void
}

export const tabPageScrollKey: InjectionKey<TabPageScrollController> = Symbol('tabPageScroll')
