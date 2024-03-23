<script lang="ts" setup>
import { onBeforeMount, onBeforeUnmount, provide, ref, watch } from 'vue'
import type { TransitionProps, DefineComponent, VNode } from 'vue'
import { type RouteLocationNormalizedLoaded ,useRoute} from 'vue-router'
import { getMaxZIndex } from './utils/TabScrollHelper'
import { type ITabData, TabScrollMode } from './model/TabModel'
import TabHeader from './components/TabHeader/index.vue'
import useTabpanel from './hooks/useTabpanel'
import useStackTab from './hooks/useStackTab'
import { useI18n } from 'vue-i18n-lite'
const { tabs, pageShown, caches, destroy, addPage, initial, setMaxSize, setGlobalScroll } =
  useTabpanel()
const emit = defineEmits(['onActive', 'onPageLoaded'])
const route =useRoute()
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
    i18n?: string
    space?: number
    globalScroll: boolean
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
    i18n: 'zh-CN',
    space: 300,
    globalScroll: false
  }
)
// provide('locales', { ...props.i18n })
// 最大化,并向下传递
const { changeLocale } = useI18n()
const maximum = ref<boolean>(false)
provide('maximum', maximum)
const { setIFramePath } = useStackTab()
setIFramePath(props.iframePath)
setGlobalScroll(props.globalScroll)
changeLocale(props.i18n)
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
setMaxSize(props.max)
onBeforeUnmount(() => {
  destroy()
})
const onComponentLoaded = () => {
  emit('onPageLoaded')
}
</script>
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
        <transition :name="pageTransition" mode="out-in">
          <keep-alive :include="caches">
            <component
              :is="tabWrapper(route, Component)"
              v-if="pageShown"
              :key="route.fullPath"
              @on-loaded="onComponentLoaded"
            />
          </keep-alive>
        </transition>
      </router-view>
      <transition-group :name="pageTransition" appear mode="out-in">
        <iframe
          v-for="frame of tabs.filter((item) => item.iframe)"
          v-show="frame.active"
          :key="frame.id"
          class="stack-tab__iframe"
          :src="/^(javascript|data):/i.test(frame.url ?? '') ? 'about:blank' : frame.url"
          frameborder="0"
        />
      </transition-group>
    </div>
  </div>
</template>
<style scoped></style>
