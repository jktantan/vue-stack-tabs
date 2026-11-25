import type { Component, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

/**
 * 页面解析器：决定页签内实际渲染什么。
 *
 * 返回 `null` / `undefined` 时使用路由匹配到的页面组件；
 * 返回组件或 VNode 时只替换页签内容，路由、URL、页签与页面栈保持不变。
 *
 * Page resolver: decides what a tab actually renders.
 *
 * Return `null` / `undefined` to use the route component; return a component or VNode
 * to override only the tab content while keeping the route, URL, tab and page stack intact.
 */
export type StackTabsPageResolver = (
  route: RouteLocationNormalizedLoaded
) => Component | VNode | null | undefined
