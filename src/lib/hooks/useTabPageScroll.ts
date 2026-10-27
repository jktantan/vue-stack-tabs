/**
 * useTabPageScroll - 页面内滚动源注册 API。
 *
 * 使用范围：缓存页内部任意层级的组件。典型场景是 `pageScroll="none"`，
 * 页面自己包了一层滚动组件，需要把真实滚动元素交给库，以便继续支持
 * 滚动位置记忆和阴影状态。
 *
 * 主要 API：
 * - `attach(element | adapter)` 注册当前页的主滚动源
 * - `detach()` 取消注册，回退到页面工厂默认策略
 */
import { hasInjectionContext, inject } from 'vue'
import { tabPageScrollKey, type TabPageScrollController } from './tabPageScrollContext'

export type { TabPageScrollController }

export const TAB_PAGE_SCROLL_UNAVAILABLE_MESSAGE =
  'useTabPageScroll() must be used inside a cached page of <VueStackTabs>; the page scope provides the scroll controller.'

export default function useTabPageScroll(): TabPageScrollController {
  const controller = hasInjectionContext() ? inject(tabPageScrollKey, null) : null
  if (!controller) throw new Error(TAB_PAGE_SCROLL_UNAVAILABLE_MESSAGE)
  return controller
}
