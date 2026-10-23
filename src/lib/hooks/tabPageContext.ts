/**
 * 页面级运行时上下文。
 *
 * 每个缓存页面（cacheName / pId）都归属于一个标签（tabId / tId）。
 * 这组信息由页面缓存包装组件通过 provide 提供，页面内的 useTabRouter、
 * useTabLoading 通过 inject 读取，不再作为 attrs 注入到用户页面组件。
 *
 * 这样做的原因：
 * - 多根节点（Fragment）页面无法继承 attrs，Vue 会在开发环境提示
 *   “Extraneous non-props attributes”；
 * - 单根节点页面会把 tId / pId 透传到根 DOM 上，造成内部 ID 泄漏；
 * - provide/inject 的边界与缓存包装组件一致，也允许页面内的嵌套组件复用。
 */
import type { InjectionKey } from 'vue'
import { getCurrentInstance, hasInjectionContext, inject } from 'vue'

export interface TabPageContext {
  /** 当前页面所属的标签 id（旧实现中的 attrs.tId） */
  tabId: string
  /** 当前页面的缓存 id，即 cacheName（旧实现中的 attrs.pId） */
  pageId: string
}

export const tabPageContextKey: InjectionKey<TabPageContext> = Symbol('tabPageContext')

/**
 * 解析当前页面上下文。
 *
 * 优先读取缓存包装组件 provide 的上下文；attrs / props 仅作为旧版
 * cloneVNode 注入方式以及手工挂载场景的兼容回退。
 *
 * 返回值允许只包含其中一个字段：useTabLoading 只依赖 tabId，
 * 旧代码或手工挂载可能只传了其中一个 id。
 */
export const resolveTabPageContext = (): Partial<TabPageContext> | null => {
  if (hasInjectionContext()) {
    const injected = inject(tabPageContextKey, null)
    if (injected) return injected
  }

  const instance = getCurrentInstance()
  if (!instance) return null

  const tabId = instance.attrs.tId ?? instance.props.tId
  const pageId = instance.attrs.pId ?? instance.props.pId
  const context: Partial<TabPageContext> = {}
  if (typeof tabId === 'string') context.tabId = tabId
  if (typeof pageId === 'string') context.pageId = pageId
  return context.tabId !== undefined || context.pageId !== undefined ? context : null
}
