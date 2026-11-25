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
import { h, isVNode } from 'vue'
import type { VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import useTabPanel from '../../hooks/useTabPanel'
import type { StackTabsPageResolver } from '../../model/PageResolver'
import StackCacheRenderer from './StackCacheRenderer.vue'

interface StackKeepAliveProps {
  /** 页面切换过渡动画名称，默认 `stack-tab-swap` / Page transition name (default: `stack-tab-swap`) */
  transitionName?: string
  /**
   * 按当前路由覆盖页签内渲染的页面组件。
   * 返回空时使用路由匹配组件；返回组件或 VNode 时只替换渲染内容，路由与 URL 不变。
   *
   * Optional resolver that overrides the rendered page per route. Returning nothing keeps
   * the matched route component; returning a component or VNode replaces only the content.
   */
  pageResolver?: StackTabsPageResolver
}

const props = withDefaults(defineProps<StackKeepAliveProps>(), {
  transitionName: 'stack-tab-swap',
  pageResolver: undefined
})

const emit = defineEmits<{
  loaded: []
}>()

const { caches, getPageRefreshVersion } = useTabPanel()

const resolvePageVNode = (
  route: RouteLocationNormalizedLoaded,
  component?: VNode | null
): VNode | null | undefined => {
  const resolved = props.pageResolver?.(route)

  if (!resolved) {
    return component
  }

  return isVNode(resolved) ? resolved : h(resolved, { route })
}

/** 页面组件加载完成时向父组件转发 */
const emitLoaded = () => {
  emit('loaded')
}
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <StackCacheRenderer
      v-slot="{ wrappedComponent, activeCacheKey, component }"
      :route="route"
      :component="Component"
    >
      <transition :name="transitionName" appear mode="out-in">
        <keep-alive :include="caches">
          <component
            :is="wrappedComponent"
            :key="activeCacheKey"
            :vnode="resolvePageVNode(route, component)"
            :refresh-version="getPageRefreshVersion(activeCacheKey)"
            :transition-name="transitionName"
            @on-loaded="emitLoaded"
          />
        </keep-alive>
      </transition>
    </StackCacheRenderer>
  </router-view>
</template>
