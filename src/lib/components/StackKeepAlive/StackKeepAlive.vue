<!--
  StackKeepAlive - 内部页面缓存渲染层

  职责：
  - 渲染 router-view 当前页面
  - 维持 transition -> keep-alive -> dynamic component 的原有结构
  - 调用 useTabPanel.addPage(route, Component) 注册栈式缓存页
  - 将缓存页 on-loaded 事件转发为 loaded

  注意：
  - 这是内部组件，暂不从 src/lib/index.ts 导出
  - 不负责 TabHeader、iframe、session 初始化或 openTab/closeTab API
-->
<script lang="ts" setup>
import type { DefineComponent, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import useTabPanel from '../../hooks/useTabPanel'

interface StackKeepAliveProps {
  transitionName?: string
}

withDefaults(defineProps<StackKeepAliveProps>(), {
  transitionName: 'stack-tab-swap'
})

const emit = defineEmits<{
  loaded: []
}>()

const { caches, refreshKey, activeCacheKey, addPage } = useTabPanel()

/** 将 router-view 的 Component 包装为带缓存 id 的页面组件，交给 addPage 注册到对应标签 */
const tabWrapper = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
  return addPage(route, component)
}

/** 页面组件加载完成时向父组件转发 */
const emitLoaded = () => {
  emit('loaded')
}
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <transition :name="transitionName" appear mode="out-in">
      <keep-alive :include="caches">
        <component
          :is="tabWrapper(route, Component)"
          :key="`${activeCacheKey}-${refreshKey}`"
          :vnode="Component"
          @on-loaded="emitLoaded"
        />
      </keep-alive>
    </transition>
  </router-view>
</template>
