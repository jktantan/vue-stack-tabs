<template>
  <div
    class="stack-tab"
    :style="{
      width: width,
      height: height,
      'z-index': maximum ? getMaxZIndex('body *:not(.stack-tab,.stack-tab *)') : undefined
    }"
    :class="{ 'stack-tab__maximum': maximum }"
  >
    <tab-header :space="space" @active="onTabActive" :tab-transition="tabTransition" :max="max">
      <template #leftButton>
        <slot name="leftButton" />
      </template>
      <template #rightButton>
        <slot name="rightButton" />
      </template>
    </tab-header>
    <div class="stack-tab__container">
      <router-view v-slot="{ Component, route }">
        <transition :name="pageTransition" appear @after-leave="pageShown = true">
          <keep-alive :include="caches">
            <component :is="tabWrapper(route, Component)" v-if="pageShown" :key="route.fullPath" />
          </keep-alive>
        </transition>
      </router-view>
      <transition-group :name="pageTransition" appear>
        <iframe
          v-for="frame of tabs.filter((item) => item.iframe)"
          v-show="frame.active && pageShown"
          :key="frame.id"
          class="stack-tab__iframe"
          :src="/^(javascript|data):/i.test(frame.url ?? '') ? 'about:blank' : frame.url"
          frameborder="0"
        />
      </transition-group>
    </div>
  </div>
</template>

<script lang="tsx" setup>
import { onBeforeMount, onUnmounted, provide, ref, watch } from 'vue'
import type { TransitionProps, DefineComponent, VNode } from 'vue'
import { type RouteLocationNormalizedLoaded, useRouter } from 'vue-router'
import { getMaxZIndex } from './utils/TabScrollHelper'
import { type ITabData, TabScrollMode } from './model/TabModel'
import TabHeader from './components/TabHeader/index.vue'
import useTabpanel from './hooks/useTabpanel'
import useStackTab from './hooks/useStackTab'
const { tabs, pageShown, caches, addPage, destroy, initial } = useTabpanel()
const emit = defineEmits(['onActive'])
const props = withDefaults(
  defineProps<{
    // 初始页签数据
    defaultTabs?: ITabData[]
    // 最大打开数量
    max?: number
    // 新页加入哪个位置
    append?: string
    // 右键菜单
    contextmenu?: boolean | object
    // 页面转场效果
    pageTransition?: string
    // 标签转场效果
    tabTransition?: string | TransitionProps
    // tab 滚动效果
    tabScrollMode?: TabScrollMode
    width?: string
    height?: string
    i18n?: { locale?: string; messages?: object }
    messages?: any
    reloadable?: boolean
    closable?: boolean
    space?: number
    iframePath: string
  }>(),
  {
    defaultTabs: () => [],
    max: 20,
    append: 'last',
    contextmenu: true,
    tabTransition: 'stack-tab-zoom',
    pageTransition: 'stack-tab-swap',
    tabScrollMode: TabScrollMode.BOTH,
    width: '100%',
    height: '100%',
    i18n: () => ({ locale: 'zh-CN', messages: {} }),
    reloadable: true,
    closable: true,
    space: 300
  }
)
provide('locales', { ...props.i18n })
// 最大化,并向下传递
const maximum = ref<boolean>(false)
provide('maximum', maximum)
const { setIFramePath } = useStackTab()
setIFramePath(props.iframePath)
onBeforeMount(() => {
  console.log('on Before mount')
  initial(props.defaultTabs)
})
const tabWrapper = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
  // return defineAsyncComponent(() => addPage(route, component))
  return addPage(route, component)
}
const onTabActive = (id: string) => {
  emit('onActive', id)
}
onUnmounted(() => {
  destroy()
})
/**
 * 路由真正转换的时候才切换页面
 * 有keepalive或组装过Component的都会多次加载
 */
const router = useRouter()
watch(
  () => router.currentRoute.value.fullPath,
  () => {
    pageShown.value = true
    // routerLeaved.value = true
    console.log('route change')
  }
)
</script>
<style scoped></style>
