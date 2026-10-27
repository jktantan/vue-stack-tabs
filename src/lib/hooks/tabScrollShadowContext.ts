/**
 * 页面级阴影上下文。
 *
 * 每个缓存页包装组件都会 provide 一份控制器，页面内任意层级的组件
 * （包括包在 page 内容外的布局组件）都可以通过 `useTabScrollShadow()` 读取。
 *
 * 状态只描述“当前应该显示哪个方向的阴影”，与是否真正渲染阴影解耦：
 * 即使业务通过 `setEnabled(false)` 关闭了库的阴影，`state` 仍然会更新。
 */
import type { InjectionKey, Ref } from 'vue'

/**
 * 当前内容区应该显示哪一侧的阴影。
 *
 * 注意：它不是“滚动方向”，而是“哪一侧还有隐藏内容”：
 * - `'none'`：内容不足一屏，或已经贴边，不显示阴影；
 * - `'top'`：上方还有内容，只显示顶部阴影；
 * - `'bottom'`：下方还有内容，只显示底部阴影；
 * - `'both'`：上下都有内容，顶部和底部阴影同时显示。
 */
export type TabScrollShadowState = 'none' | 'top' | 'bottom' | 'both'

export interface TabScrollShadowController {
  /** 当前应该显示哪个方向的阴影（只读）。 */
  state: Readonly<Ref<TabScrollShadowState>>
  /** 当前页是否允许库渲染阴影；受全局配置与页面手动开关共同控制。 */
  enabled: Readonly<Ref<boolean>>
  /** 手动设置当前页是否显示阴影（覆盖全局配置）。 */
  setEnabled: (enabled: boolean) => void
  /** 清除手动开关，回退到全局配置。 */
  reset: () => void
  /** 同步读取当前阴影方向。 */
  getState: () => TabScrollShadowState
  /** 订阅阴影方向变化；返回取消订阅函数。 */
  onStateChange: (listener: (state: TabScrollShadowState) => void) => () => void
}

export const tabScrollShadowKey: InjectionKey<TabScrollShadowController> = Symbol('tabScrollShadow')
