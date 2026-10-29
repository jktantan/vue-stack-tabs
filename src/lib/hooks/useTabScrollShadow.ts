/**
 * useTabScrollShadow - 页面内阴影控制 API。
 *
 * 使用范围：缓存页内部任意层级的组件（页面组件、页面外层布局组件、
 * 自定义滚动组件等）。通过缓存页包装组件 provide 的上下文工作。
 *
 * 主要 API：
 * - `state`        当前应该显示哪个方向的阴影（响应式）
 * - `enabled`      当前页是否允许库渲染阴影
 * - `setEnabled`   手动开关当前页阴影
 * - `reset`        清除手动开关，回退到全局配置
 * - `getState`     同步读取当前方向
 * - `onStateChange` 订阅方向变化
 */
import { hasInjectionContext, inject } from 'vue'
import {
  tabScrollShadowKey,
  type TabScrollShadowConfig,
  type TabScrollShadowController,
  type TabScrollShadowSides,
  type TabScrollShadowState
} from './tabScrollShadowContext'

export type {
  TabScrollShadowConfig,
  TabScrollShadowController,
  TabScrollShadowSides,
  TabScrollShadowState
}

export const TAB_SCROLL_SHADOW_UNAVAILABLE_MESSAGE =
  'useTabScrollShadow() must be used inside a cached page of <VueStackTabs>; the page scope provides the shadow controller.'

export default function useTabScrollShadow(): TabScrollShadowController {
  const controller = hasInjectionContext() ? inject(tabScrollShadowKey, null) : null
  if (!controller) throw new Error(TAB_SCROLL_SHADOW_UNAVAILABLE_MESSAGE)
  return controller
}
