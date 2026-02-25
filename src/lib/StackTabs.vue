<!--
  StackTabs - 堆叠式标签页主组件

  职责：
  - 标签页容器，集成 TabHeader、router-view、keep-alive、iframe 展示
  - 包裹在 router-view 外层，将路由渲染到对应标签的缓存页面中

  数据流：
  - useTabPanel：tabs/caches/excludedCacheIdsForRefresh/refreshKey
  - useTabActions：openTab/closeTab 等，需 setIFramePath
  - keep-alive include=caches，exclude=excludedCacheIdsForRefresh（刷新时排除）
-->
<script lang="ts" setup>
import { computed, onBeforeMount, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
import type { TransitionProps, DefineComponent, VNode } from 'vue'
import { type RouteLocationNormalizedLoaded } from 'vue-router'
import { getMaxZIndex } from './utils/scrollUtils'
import { isInvalidIframeUrl } from './utils/urlParser'
import { type ITabData, TabScrollMode } from './model/TabModel'
import TabHeader from './components/TabHeader/index.vue'
import useTabPanel from './hooks/useTabPanel'
import useTabActions from './hooks/useTabActions'
import { useI18n } from 'vue-i18n-lite'
import { useTabEmitter } from '@/lib/hooks/useTabEventBus'
const {
  tabs,
  caches,
  iframeRefreshKeys,
  activeCacheKey,
  destroy,
  addPage,
  initialize,
  setMaxSize,
  setGlobalScroll,
  setSessionPrefix
} = useTabPanel()
/** keep-alive 的 include 列表；excludedCacheIdsForRefresh 为刷新时临时 exclude，触发重挂载 */
const emit = defineEmits(['onActive', 'onPageLoaded'])
const props = withDefaults(
  defineProps<{
    // 初始页签数据
    defaultTabs?: ITabData[]
    // 最大打开数量
    max?: number
    // 右键菜单
    contextmenu?: boolean | object
    // 页面转场效果
    pageTransition?: string
    pageTransitionBack?: string
    // 标签转场效果
    tabTransition?: string | TransitionProps
    // tab 滚动效果
    tabScrollMode?: TabScrollMode
    width?: string
    height?: string
    i18n?: string
    space?: number
    globalScroll?: boolean
    iframePath: string
    sessionPrefix?: string
    /** 允许通过 postMessage 调用 openTab 的 iframe 来源，默认仅同源 */
    iframeAllowedOrigins?: string[]
  }>(),
  {
    defaultTabs: () => [],
    max: 20,
    contextmenu: true,
    tabTransition: 'stack-tab-zoom',
    pageTransition: 'stack-tab-swap',
    pageTransitionBack: 'stack-tab-swap-back',
    tabScrollMode: TabScrollMode.BOTH,
    width: '100%',
    height: '100%',
    i18n: 'zh-CN',
    space: 300,
    globalScroll: false,
    sessionPrefix: '',
    iframeAllowedOrigins: () => []
  }
)
const { changeLocale, t } = useI18n()
/** 是否最大化显示，通过 provide 向下传递 */
const maximum = ref<boolean>(false)
provide('maximum', maximum)
const { setIFramePath, openTab } = useTabActions()
setIFramePath(props.iframePath)
setGlobalScroll(props.globalScroll)
changeLocale(props.i18n)
/** 将 router-view 的 Component 包装为带缓存 id 的页面组件，交给 addPage 注册到对应标签 */
const tabWrapper = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
  return addPage(route, component)
}
/** 标签激活时向外转发 */
const onTabActive = (id: string) => {
  emit('onActive', id)
}
setMaxSize(props.max)
/** 页面组件加载完成时向外转发 */
const onComponentLoaded = () => {
  emit('onPageLoaded')
}
/** 当前页面转场动画名，前进/后退时由 useTabRouter 发出 FORWARD/BACKWARD 事件切换 */
const pageSwitch = ref<string>(props.pageTransition)
const emitter = useTabEmitter()
/** 前进时使用 pageTransition */
const forwardHandler = () => {
  pageSwitch.value = props.pageTransition
}
/** 后退时使用 pageTransitionBack */
const backwardHandler = () => {
  pageSwitch.value = props.pageTransitionBack
}
emitter.on('FORWARD', forwardHandler)
emitter.on('BACKWARD', backwardHandler)

/** iframe 标签列表，computed 避免重复 filter */
const iframeTabs = computed(() => tabs.value.filter((item) => item.iframe))

/** 已激活过的 iframe 使用真实 URL（保留内容），未激活过的用 about:blank（按需加载，切换不重载） */
const iframeEverActivated = reactive<Record<string, boolean>>({})
/** 当前激活且有有效 URL 的 iframe 列表（供 watch 复用，减少重复 filter） */
const activeIframesWithUrl = computed(() =>
  iframeTabs.value.filter((f) => f.active && (f.url ?? '') && !isInvalidIframeUrl(f.url ?? ''))
)
watch(
  activeIframesWithUrl,
  (frames) => {
    for (const f of frames) iframeEverActivated[f.id] = true
  },
  { immediate: true, deep: true }
)
/**
 * 获取 iframe 的 src：未激活过的用 about:blank 延迟加载，已激活的保留真实 URL
 * @param frame - iframe 标签项
 * @returns 实际加载的 URL
 */
const getIframeSrc = (frame: { id: string; url?: string }) => {
  const url = frame.url ?? ''
  if (isInvalidIframeUrl(url)) return 'about:blank'
  return iframeEverActivated[frame.id] ? url : 'about:blank'
}

/** iframe 的 key：postMessage 模式仅用 id（不重建，动画正常）；reload 模式含 refreshKeys */
const getIframeKey = (frame: { id: string; iframeRefreshMode?: string }) =>
  frame.iframeRefreshMode === 'reload'
    ? `${frame.id}-${iframeRefreshKeys.value[frame.id] ?? 0}`
    : frame.id

/** 各 iframe 是否已加载过（切回时不再显示 loading，因 load 不会再次触发） */
const iframeHasLoaded = reactive<Record<string, boolean>>({})
/** 各 iframe 加载状态，仅在首次加载时显示 */
const iframeLoadingStates = reactive<Record<string, boolean>>({})
/** iframe 加载超时定时器 Map，用于兜底清理 loading 状态 */
const loadTimeoutIds = new Map<string, ReturnType<typeof setTimeout>>()
/** 加载超时时间（ms），超时后强制隐藏 loading */
const LOAD_TIMEOUT_MS = 5000

/** 标记 iframe 已加载完成，清除超时并隐藏 loading */
const setIframeLoaded = (frameId: string) => {
  const tid = loadTimeoutIds.get(frameId)
  if (tid) {
    clearTimeout(tid)
    loadTimeoutIds.delete(frameId)
  }
  iframeHasLoaded[frameId] = true
  iframeLoadingStates[frameId] = false
}

/** 为 iframe 显示 loading 状态，已加载过的切回时不重复显示；设置超时兜底 */
const setIframeLoading = (frameId: string) => {
  if (iframeHasLoaded[frameId]) return // 已加载过，切回时不显示 loading
  iframeLoadingStates[frameId] = true
  const tid = loadTimeoutIds.get(frameId)
  if (tid) clearTimeout(tid)
  loadTimeoutIds.set(
    frameId,
    setTimeout(() => {
      loadTimeoutIds.delete(frameId)
      iframeLoadingStates[frameId] = false
    }, LOAD_TIMEOUT_MS)
  )
}

// 当 iframe 标签变为激活且有真实 URL 时，显示加载状态（仅首次）
watch(
  activeIframesWithUrl,
  (frames) => {
    for (const f of frames) setIframeLoading(f.id)
  },
  { immediate: true, deep: true }
)

/** iframe 元素 refs，key 为 tabId，用于 postMessage 刷新时获取 contentWindow */
const iframeElRefs = reactive<Record<string, HTMLIFrameElement | null>>({})
/** 注册/注销 iframe 的 DOM 引用 */
const setIframeRef = (id: string, el: HTMLIFrameElement | null) => {
  if (el) {
    iframeElRefs[id] = el
  } else {
    delete iframeElRefs[id]
  }
}

/** postMessage 刷新：向 iframe 发送消息，由其自行刷新 */
const handleRefreshIframePostMessage = (payload: unknown) => {
  const tabId = payload as string
  const iframe = iframeElRefs[tabId]
  if (iframe?.contentWindow) {
    try {
      console.log(
        `[vue-stack-tabs] Sending 'vue-stack-tabs:refresh' postMessage to iframe: ${tabId}`
      )
      iframe.contentWindow.postMessage({ type: 'vue-stack-tabs:refresh' }, '*')
    } catch (e) {
      console.warn(`[vue-stack-tabs] Failed to send refresh postMessage to iframe: ${tabId}`, e)
    }
  } else {
    console.warn(
      `[vue-stack-tabs] IFrame element not found for tabId: ${tabId} when trying to refresh.`
    )
  }
}

/** 允许通过 postMessage 调用 openTab 的来源白名单 */
const allowedOrigins = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const extra = props.iframeAllowedOrigins ?? []
  return [origin, ...extra].filter(Boolean)
})
/** 处理 iframe 发来的 postMessage，校验 origin 后调用 openTab */
const handleMessage = (ev: MessageEvent) => {
  if (!allowedOrigins.value.includes(ev.origin)) return
  const data = ev.data
  // 兼容旧格式的数据（如果存在）或直接支持标准的数据格式
  if (!data || typeof data !== 'object') return

  if (data.type === 'vue-stack-tabs:openTab') {
    const payload = data.payload
    if (payload && typeof payload === 'object' && payload.title && payload.path) {
      openTab(payload)
    }
  } else if (data.type === 'openTab') {
    // 兼容原生旧示例中的类型名
    const payload = data.payload
    if (payload && typeof payload === 'object' && payload.title && payload.path) {
      openTab(payload)
    }
  }
}

;(emitter as { on: (t: string, h: (p: unknown) => void) => void }).on(
  'REFRESH_IFRAME_POSTMESSAGE',
  handleRefreshIframePostMessage
)

onBeforeMount(() => {
  setSessionPrefix(props.sessionPrefix)
  initialize(props.defaultTabs)
  window.addEventListener('message', handleMessage)
})
onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
  ;(emitter as { off: (t: string, h: (p: unknown) => void) => void }).off(
    'REFRESH_IFRAME_POSTMESSAGE',
    handleRefreshIframePostMessage
  )
  emitter.off('FORWARD', forwardHandler)
  emitter.off('BACKWARD', backwardHandler)
  destroy()
})
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
    <tab-header :space="space" :tab-transition="tabTransition" :max="max" @active="onTabActive">
      <template #leftButton>
        <slot name="leftButton" />
      </template>
      <template #rightButton>
        <slot name="rightButton" />
      </template>
    </tab-header>
    <div class="stack-tab__container">
      <router-view v-slot="{ Component, route }">
        <transition :name="pageSwitch" appear mode="out-in">
          <keep-alive :include="caches">
            <component
              :is="tabWrapper(route, Component)"
              :key="activeCacheKey"
              :vnode="Component"
              @on-loaded="onComponentLoaded"
            />
          </keep-alive>
        </transition>
      </router-view>
      <transition-group :name="pageTransition" tag="div" class="stack-tab__iframes" appear>
        <Transition
          v-for="frame of iframeTabs"
          :key="getIframeKey(frame)"
          :name="pageTransition"
          appear
        >
          <div v-show="frame.active" class="stack-tab__iframe-wrapper">
            <div v-show="iframeLoadingStates[frame.id] !== false" class="stack-tab__iframe-loading">
              <span class="stack-tab__iframe-loading-text">{{ t('VueStackTab.loading') }}</span>
            </div>
            <iframe
              :key="iframeRefreshKeys[frame.id] || 0"
              :ref="(el) => setIframeRef(frame.id, el as HTMLIFrameElement | null)"
              class="stack-tab__iframe"
              :src="getIframeSrc(frame)"
              frameborder="0"
              @load="setIframeLoaded(frame.id)"
            />
          </div>
        </Transition>
      </transition-group>
    </div>
  </div>
</template>
<style scoped></style>
