<!--
  StackCacheRenderer - 内部缓存组件解析层

  职责：
  - 接收 router-view slot 提供的 route 与 Component
  - 仅在 route/component 身份变化时调用 useTabPanel.addPage
  - 通过 scoped slot 暴露包装组件，确保真正的缓存页仍是 keep-alive 的直接子节点

  注意：
  - 这是内部组件，暂不从 src/lib/index.ts 导出
  - 不负责 transition、keep-alive、TabHeader、iframe 或 session 初始化
-->
<script lang="ts" setup>
import { defineComponent, shallowRef, watch } from 'vue'
import type { DefineComponent, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import useTabPanel from '../../hooks/useTabPanel'

interface StackCacheRendererProps {
  route: RouteLocationNormalizedLoaded
  component?: VNode | null
}

interface StackCacheRendererSlotProps {
  wrappedComponent: DefineComponent
  activeCacheKey: string
  refreshKey: number
  component?: VNode | null
}

const props = defineProps<StackCacheRendererProps>()

defineSlots<{
  default(props: StackCacheRendererSlotProps): unknown
}>()

const { refreshKey, activeCacheKey, addPage } = useTabPanel()

const EmptyRendererComponent = defineComponent({
  name: 'StackCacheRendererEmpty',
  setup() {
    return () => null
  }
}) as DefineComponent

const wrappedComponent = shallowRef<DefineComponent>(EmptyRendererComponent)

const getComponentIdentity = (component?: VNode | null): unknown => {
  return component?.type ?? component
}

watch(
  [
    () => props.route.fullPath,
    () => getComponentIdentity(props.component),
    () => refreshKey.value
  ],
  () => {
    wrappedComponent.value = addPage(props.route, props.component)
  },
  { immediate: true }
)
</script>

<template>
  <slot
    :wrapped-component="wrappedComponent"
    :active-cache-key="activeCacheKey"
    :refresh-key="refreshKey"
    :component="component"
  />
</template>
