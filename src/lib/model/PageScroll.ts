import type { Component } from 'vue'

/**
 * 页面内容区滚动策略。
 *
 * - `'native'`：由库内缓存页 wrapper 使用原生滚动；
 * - `'none'`：库不接管滚动，由页面自己处理（可配合 `useTabPageScroll` 注册滚动源）；
 * - `Component`：由传入的滚动组件接管滚动，需渲染默认插槽并 expose `scrollElement`
 *   或实现 `StackTabsScrollAdapter`。
 */
export type StackTabsPageScroll = 'native' | 'none' | Component

/** 归一化后的内部滚动模式。 */
export type StackTabsPageScrollMode = 'native' | 'none' | 'custom'

/** 是否为自定义滚动组件（组件对象或函数式组件）。 */
export const isPageScrollComponent = (value: StackTabsPageScroll): value is Component =>
  typeof value === 'function' || (typeof value === 'object' && value !== null)

/** 把对外配置归一化为内部模式。 */
export const resolvePageScrollMode = (value: StackTabsPageScroll): StackTabsPageScrollMode => {
  if (value === 'native') return 'native'
  if (value === 'none') return 'none'
  return 'custom'
}
