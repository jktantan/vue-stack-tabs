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

/**
 * 内容区上下阴影的开关配置。
 *
 * - `boolean`：同时控制上下两侧，`false` 表示两侧都不渲染；
 * - `{ top?, bottom? }`：单独控制某一侧，未声明的一侧默认启用。
 *
 * 只影响库是否渲染阴影，不影响 `state` 的方向计算。
 */
export type TabScrollShadowConfig = boolean | { top?: boolean; bottom?: boolean }

/** 解析后的分侧开关，`top` / `bottom` 均为确定的布尔值。 */
export interface TabScrollShadowSides {
  top: boolean
  bottom: boolean
}

/** 把 `TabScrollShadowConfig` 归一化为分侧布尔值（缺省侧视为启用）。 */
export const resolveTabScrollShadowSides = (
  config: TabScrollShadowConfig | null | undefined
): TabScrollShadowSides => {
  if (typeof config === 'boolean') return { top: config, bottom: config }
  return { top: config?.top ?? true, bottom: config?.bottom ?? true }
}

export interface TabScrollShadowController {
  /** 当前应该显示哪个方向的阴影（只读）。 */
  state: Readonly<Ref<TabScrollShadowState>>
  /** 当前页是否允许库渲染阴影；任一侧启用即为 `true`。 */
  enabled: Readonly<Ref<boolean>>
  /** 当前页上下两侧是否允许库渲染阴影（只读）。 */
  enabledSides: Readonly<Ref<TabScrollShadowSides>>
  /**
   * 手动设置当前页是否显示阴影（覆盖全局配置）。
   * 传 `boolean` 同时控制上下两侧；传对象可单独控制某一侧。
   */
  setEnabled: (enabled: TabScrollShadowConfig) => void
  /** 清除手动开关，回退到全局配置。 */
  reset: () => void
  /** 同步读取当前阴影方向。 */
  getState: () => TabScrollShadowState
  /** 订阅阴影方向变化；返回取消订阅函数。 */
  onStateChange: (listener: (state: TabScrollShadowState) => void) => () => void
}

export const tabScrollShadowKey: InjectionKey<TabScrollShadowController> = Symbol('tabScrollShadow')
