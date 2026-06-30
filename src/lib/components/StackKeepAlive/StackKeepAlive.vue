<!--
  StackKeepAlive - 内部页面缓存渲染层

  职责：
  - 渲染 router-view 当前页面
  - 维持 transition -> keep-alive -> dynamic component 的原有结构
  - 通过 StackCacheRenderer 注册并解析栈式缓存页
  - 将缓存页 on-loaded 事件转发为 loaded

  注意：
  - 这是内部组件，暂不从 src/lib/index.ts 导出
  - 不负责 TabHeader、iframe、session 初始化或 openTab/closeTab API
-->
<script lang="ts" setup>
import useTabPanel from '../../hooks/useTabPanel'
import StackCacheRenderer from './StackCacheRenderer.vue'

interface StackKeepAliveProps {
  transitionName?: string
}

withDefaults(defineProps<StackKeepAliveProps>(), {
  transitionName: 'stack-tab-swap'
})

const emit = defineEmits<{
  loaded: []
}>()

const { caches } = useTabPanel()

/** 页面组件加载完成时向父组件转发 */
const emitLoaded = () => {
  emit('loaded')
}
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <StackCacheRenderer
      v-slot="{ wrappedComponent, activeCacheKey, refreshKey, component }"
      :route="route"
      :component="Component"
    >
      <transition :name="transitionName" appear mode="out-in">
        <keep-alive :include="caches">
          <component
            :is="wrappedComponent"
            :key="`${activeCacheKey}-${refreshKey}`"
            :vnode="component"
            @on-loaded="emitLoaded"
          />
        </keep-alive>
      </transition>
    </StackCacheRenderer>
  </router-view>
</template>
