/**
 * 共享的 Empty 占位组件。
 *
 * useTabPanel 在「empty」/「recovered」分支会返回一个不渲染任何内容的占位组件。
 * 原先在 pageComponentFactory.tsx 和 StackCacheRenderer.vue 各自定义了一份，
 * 这里抽出唯一来源，避免两份略有差异的副本带来维护负担。
 */
import { defineComponent } from 'vue'
import type { DefineComponent } from 'vue'

export const EmptyPlaceholderComponent = defineComponent({
  name: 'StackTabEmptyPlaceholder',
  setup() {
    return () => null
  }
}) as DefineComponent

export const getEmptyPlaceholderComponent = (): DefineComponent => EmptyPlaceholderComponent
