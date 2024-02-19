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
    <tab-header :space="space" @active="onTabActive">
      <template #leftButton>
        <slot name="leftButton" />
      </template>
      <template #rightButton>
        <slot name="rightButton" />
      </template>
    </tab-header>
    <div class="flex-auto overflow-hidden relative">
      <router-view v-slot="{ Component, route }">
        <transition :name="pageTransition" appear @after-leave="routerLeaved = true">
          <keep-alive :include="caches">
            <component :is="wrap(route, Component)" v-if="routerAlive && routerLeaved" :key="route.fullPath" />
          </keep-alive>
        </transition>
      </router-view>
      <transition-group :name="pageTransition" appear>
        <iframe
          v-for="frame of tabItems.filter(item => item.type === ContainerType.IFRAME)"
          v-show="frame.active && routerAlive && routerLeaved"
          :key="frame.id"
          class="stack-tab__iframe"
          :src="/^(javascript|data):/i.test(frame.url) ? 'about:blank' : frame.url"
          frameborder="0"
        />
      </transition-group>
    </div>
  </div>
</template>

<script lang="tsx" setup>
import { provide, ref, TransitionProps, VNode } from 'vue'

import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { getMaxZIndex } from './utils/TabScrollHelper'
import { DefaultTabData, TabScrollMode } from './model/TabModel'
import { ContainerType } from './model/TabContainerModel'
import TabHeader from './components/TabHeader/index.vue'
import useTabEvent from '~/components/common/VueStackTab/hooks/useTabEvent'
const { routerAlive, routerLeaved, caches, addTab, tabs: tabItems, clearTabData, addDefault } = useTabEvent()
const emit = defineEmits(['tabSelect'])
const props = withDefaults(
  defineProps<{
    // 初始页签数据
    defaultTabs?: DefaultTabData[]
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
  }>(),
  {
    defaultTabs: () => [],
    max: 20,
    append: 'last',
    contextmenu: true,
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

onBeforeMount(() => {
  console.log('on Before mount')
  addDefault(props.defaultTabs)
})
const wrap = (route: RouteLocationNormalizedLoaded, component: VNode) => {
  console.log('on Add tab', route)
  // currentRoute.value = route
  return addTab(route, component)
}
const onTabActive = (id: string) => {
  emit('tabSelect', id)
}
onUnmounted(() => {
  clearTabData()
})
/**
 * 路由真正转换的时候才切换页面
 * 有keepalive或组装过Component的都会多次加载
 */
const router = useRouter()
watch(
  () => router.currentRoute.value.fullPath,
  () => {
    routerAlive.value = true
    // routerLeaved.value = true
    console.log('route change')
  }
)
</script>
<style scoped></style>
