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
import {
  computed,
  getCurrentInstance,
  inject,
  onBeforeMount,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  watch
} from 'vue'
import type { TransitionProps } from 'vue'
import { getMaxZIndex } from './utils/scrollUtils'
import { isAllowedTabUrl, toSafeTabUrl } from './utils/urlParser'
import { applyStackTabsLocale } from './i18n/stackTabsLocale'
import { type ITabData, TabScrollMode } from './model/TabModel'
import TabHeader from './components/TabHeader/index.vue'
import StackKeepAlive from './components/StackKeepAlive/StackKeepAlive.vue'
import useTabPanel from './hooks/useTabPanel'
import useTabActions from './hooks/useTabActions'
import { useI18n } from 'vue-i18n-lite'
import { TabEventType, tabEmitterKey } from './hooks/useTabEventBus'
import {
  createStackTabsRuntimeContext,
  maximumKey,
  registerStackTabsRuntimeContext,
  stackTabsContextKey,
  unregisterStackTabsRuntimeContext
} from './hooks/stackTabsContext'
import { getPostMessageTargetOrigin, isStackTabsOpenTabMessage } from './utils/stackTabsMessage'
import { getStackTabPanelId, getStackTabTabId } from './utils/stackTabsA11y'
type StackTabsIframeReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'

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
    iframeSandbox?: string
    iframeReferrerPolicy?: StackTabsIframeReferrerPolicy
    iframeAllow?: string
    iframeLoadTimeout?: number
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
    i18n: undefined,
    space: 300,
    globalScroll: false,
    sessionPrefix: '',
    iframeAllowedOrigins: () => [],
    iframeSandbox: 'allow-scripts allow-forms allow-popups allow-downloads allow-same-origin',
    iframeReferrerPolicy: 'strict-origin-when-cross-origin' as StackTabsIframeReferrerPolicy,
    iframeAllow: '',
    iframeLoadTimeout: 15000
  }
)
const { changeLocale, t } = useI18n()
const runtimeContext =
  inject(stackTabsContextKey, null) ??
  createStackTabsRuntimeContext({
    iframePath: props.iframePath,
    maxTabCount: props.max,
    useGlobalScroll: props.globalScroll,
    sessionPrefix: props.sessionPrefix
  })
const stackTabsApp = getCurrentInstance()?.appContext.app
const isRuntimeContextOwner = registerStackTabsRuntimeContext(
  runtimeContext,
  stackTabsApp ? { app: stackTabsApp } : undefined
)
if (isRuntimeContextOwner) {
  provide(stackTabsContextKey, runtimeContext)
  provide(tabEmitterKey, runtimeContext.eventBus)
}
/** 是否最大化显示，通过 provide 向下传递 */
const maximum = ref<boolean>(false)
if (isRuntimeContextOwner) {
  provide(maximumKey, maximum)
}
const panelApi = isRuntimeContextOwner
  ? useTabPanel()
  : {
      tabs: runtimeContext.tabs,
      iframeRefreshKeys: runtimeContext.iframeRefreshKeys,
      destroy: () => undefined,
      initialize: () => undefined,
      setMaxSize: () => undefined,
      setGlobalScroll: () => undefined,
      setSessionPrefix: () => undefined
    }
const {
  tabs,
  iframeRefreshKeys,
  destroy,
  initialize,
  setMaxSize,
  setGlobalScroll,
  setSessionPrefix
} = panelApi
const tabActions = isRuntimeContextOwner
  ? useTabActions()
  : {
      setIFramePath: () => undefined,
      openTab: () => Promise.resolve(undefined),
      openInNewWindow: () => undefined
    }
const { setIFramePath, openTab, openInNewWindow } = tabActions
if (isRuntimeContextOwner) {
  setIFramePath(props.iframePath)
  setGlobalScroll(props.globalScroll)
  setMaxSize(props.max)
  applyStackTabsLocale(changeLocale, props.i18n)
}
/** 标签激活时向外转发 */
const onTabActive = (id: string) => {
  emit('onActive', id)
}
/** 页面组件加载完成时向外转发 */
const onComponentLoaded = () => {
  emit('onPageLoaded')
}
/** 当前页面转场动画名，前进/后退时由 useTabRouter 发出 FORWARD/BACKWARD 事件切换 */
const pageSwitch = ref<string>(props.pageTransition)
const emitter = runtimeContext.eventBus
/** 前进时使用 pageTransition */
const forwardHandler = () => {
  pageSwitch.value = props.pageTransition
}
/** 后退时使用 pageTransitionBack */
const backwardHandler = () => {
  pageSwitch.value = props.pageTransitionBack
}
if (isRuntimeContextOwner) {
  emitter.on(TabEventType.FORWARD, forwardHandler)
  emitter.on(TabEventType.BACKWARD, backwardHandler)
}

/** iframe 标签列表，computed 避免重复 filter */
const iframeTabs = computed(() => tabs.value.filter((item) => item.iframe))
const activeNonIframeTab = computed(() => tabs.value.find((item) => item.active && !item.iframe))
const hasActiveNonIframeTab = computed(() => Boolean(activeNonIframeTab.value))

/** 已激活过的 iframe 使用真实 URL（保留内容），未激活过的用 about:blank（按需加载，切换不重载） */
const iframeEverActivated = reactive<Record<string, boolean>>({})
/** 当前激活且有有效 URL 的 iframe 列表（供 watch 复用，减少重复 filter） */
const activeIframesWithUrl = computed(() =>
  iframeTabs.value.filter((f) => f.active && (f.url ?? '') && isAllowedTabUrl(f.url ?? ''))
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
const appendIframeRefreshKey = (src: string, refreshKey: number): string => {
  if (refreshKey <= 0 || src === 'about:blank') return src

  const hashIndex = src.indexOf('#')
  const baseWithSearch = hashIndex >= 0 ? src.slice(0, hashIndex) : src
  const hash = hashIndex >= 0 ? src.slice(hashIndex) : ''
  const searchIndex = baseWithSearch.indexOf('?')
  const path = searchIndex >= 0 ? baseWithSearch.slice(0, searchIndex) : baseWithSearch
  const search = searchIndex >= 0 ? baseWithSearch.slice(searchIndex + 1) : ''
  const searchParams = new URLSearchParams(search)
  searchParams.set('__stack_tabs_refresh', String(refreshKey))

  return `${path}?${searchParams.toString()}${hash}`
}

const getIframeRefreshKey = (frameId: string): number => iframeRefreshKeys.value[frameId] ?? 0
const getIframeSrc = (frame: { id: string; url?: string }, refreshKey = getIframeRefreshKey(frame.id)) => {
  const safeUrl = toSafeTabUrl(frame.url ?? '')
  const src = iframeEverActivated[frame.id] ? safeUrl : 'about:blank'
  return appendIframeRefreshKey(src, refreshKey)
}

/** iframe 的 key：包含刷新 key，确保错误态重试与 reload refresh 都能重建 iframe */
const getIframeKey = (frame: { id: string }) => `${frame.id}-${getIframeRefreshKey(frame.id)}`

type IframeLoadStatus = 'idle' | 'loading' | 'loaded' | 'timeout'

interface IframeLoadState {
  status: IframeLoadStatus
  message?: string
}

const iframeLoadStates = reactive<Record<string, IframeLoadState>>({})
const getIframeLoadState = (frameId: string): IframeLoadState =>
  iframeLoadStates[frameId] ?? { status: 'idle' }
/** iframe 加载超时定时器 Map，用于兜底清理 loading 状态 */
const loadTimeoutIds = new Map<string, ReturnType<typeof setTimeout>>()

const clearIframeLoadTimeout = (frameId: string) => {
  const timeoutId = loadTimeoutIds.get(frameId)
  if (!timeoutId) return
  clearTimeout(timeoutId)
  loadTimeoutIds.delete(frameId)
}

/** 标记 iframe 已加载完成，清除超时并隐藏 loading */
const setIframeLoaded = (frameId: string) => {
  clearIframeLoadTimeout(frameId)
  iframeLoadStates[frameId] = { status: 'loaded' }
}

/** 为 iframe 显示 loading 状态，已加载过的切回时不重复显示；设置超时兜底 */
const setIframeLoading = (frameId: string, options: { force?: boolean } = {}) => {
  const current = getIframeLoadState(frameId)
  if (current.status === 'loaded' && !options.force) return

  clearIframeLoadTimeout(frameId)
  iframeLoadStates[frameId] = { status: 'loading' }
  loadTimeoutIds.set(
    frameId,
    setTimeout(() => {
      loadTimeoutIds.delete(frameId)
      if (getIframeLoadState(frameId).status === 'loading') {
        iframeLoadStates[frameId] = {
          status: 'timeout',
          message: t('VueStackTab.iframeLoadTimeout')
        }
      }
    }, props.iframeLoadTimeout)
  )
}

const retryIframe = (frameId: string) => {
  iframeLoadStates[frameId] = { status: 'idle' }
  iframeRefreshKeys.value = {
    ...iframeRefreshKeys.value,
    [frameId]: (iframeRefreshKeys.value[frameId] ?? 0) + 1
  }
  setIframeLoading(frameId, { force: true })
}

const shouldShowIframeLoading = (frameId: string) => getIframeLoadState(frameId).status === 'loading'
const shouldShowIframeError = (frameId: string) => getIframeLoadState(frameId).status === 'timeout'

const handleIframeLoad = (frame: { id: string; url?: string }, event: Event) => {
  const iframe = event.currentTarget as HTMLIFrameElement | null
  const refreshKey = Number(iframe?.dataset.refreshKey ?? 0)
  if (!iframeEverActivated[frame.id]) return
  if (getIframeSrc(frame, refreshKey) === 'about:blank') return
  if (refreshKey !== getIframeRefreshKey(frame.id)) return
  if (iframe !== iframeElRefs[frame.id]) return
  setIframeLoaded(frame.id)
}

// 当 iframe 标签变为激活且有真实 URL 时，显示加载状态（仅首次）
watch(
  activeIframesWithUrl,
  (frames) => {
    for (const f of frames) setIframeLoading(f.id)
  },
  { immediate: true, deep: true }
)

watch(
  iframeRefreshKeys,
  (keys, previousKeys = {}) => {
    for (const frame of iframeTabs.value) {
      if (!frame.active) continue
      const nextKey = keys[frame.id] ?? 0
      const previousKey = previousKeys[frame.id] ?? 0
      if (nextKey !== previousKey) {
        setIframeLoading(frame.id, { force: true })
      }
    }
  },
  { deep: true }
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

watch(
  iframeTabs,
  (frames) => {
    const activeIds = new Set(frames.map((frame) => frame.id))
    for (const id of Object.keys(iframeLoadStates)) {
      if (!activeIds.has(id)) {
        clearIframeLoadTimeout(id)
        delete iframeLoadStates[id]
        delete iframeEverActivated[id]
        delete iframeElRefs[id]
      }
    }
  },
  { immediate: true }
)

/** postMessage 刷新：向 iframe 发送消息，由其自行刷新 */
const handleRefreshIframePostMessage = (tabId: string) => {
  const iframe = iframeElRefs[tabId]
  const tab = tabs.value.find((item) => item.id === tabId)
  if (iframe?.contentWindow) {
    try {
      const targetOrigin = getPostMessageTargetOrigin(tab?.url ?? '')
      if (!targetOrigin) {
        console.warn(
          `[vue-stack-tabs] Skip refresh postMessage because iframe URL is invalid: ${tabId}`
        )
        return
      }
      iframe.contentWindow.postMessage({ type: 'vue-stack-tabs:refresh' }, targetOrigin)
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
/** 校验 postMessage 来源必须是当前实例管理的 iframe */
const isManagedIframeSource = (source: Parameters<typeof isStackTabsOpenTabMessage>[0]['source']) =>
  Object.values(iframeElRefs).some((iframe) => iframe?.contentWindow === source)

/** 处理 iframe 发来的 postMessage，校验 origin/source/payload 后调用 openTab */
const handleMessage = (ev: MessageEvent) => {
  if (!allowedOrigins.value.includes(ev.origin)) return

  const payload = isStackTabsOpenTabMessage(ev, isManagedIframeSource)
  if (!payload) return

  openTab(payload).catch((error: unknown) => {
    console.warn('[vue-stack-tabs] Failed to open tab from iframe message:', error)
  })
}

if (isRuntimeContextOwner) {
  emitter.on(TabEventType.REFRESH_IFRAME_POSTMESSAGE, handleRefreshIframePostMessage)
}

onBeforeMount(() => {
  if (!isRuntimeContextOwner) return
  setSessionPrefix(props.sessionPrefix)
  initialize(props.defaultTabs)
  window.addEventListener('message', handleMessage)
})
onBeforeUnmount(() => {
  for (const timeoutId of loadTimeoutIds.values()) clearTimeout(timeoutId)
  loadTimeoutIds.clear()
  if (!isRuntimeContextOwner) return
  window.removeEventListener('message', handleMessage)
  emitter.off(TabEventType.REFRESH_IFRAME_POSTMESSAGE, handleRefreshIframePostMessage)
  emitter.off(TabEventType.FORWARD, forwardHandler)
  emitter.off(TabEventType.BACKWARD, backwardHandler)
  destroy()
  unregisterStackTabsRuntimeContext(
    runtimeContext,
    stackTabsApp ? { app: stackTabsApp } : undefined
  )
})
</script>
<template>
  <div
    v-if="isRuntimeContextOwner"
    class="stack-tab"
    :style="{
      width: width,
      height: height,
      'z-index': maximum ? getMaxZIndex('body *:not(.stack-tab,.stack-tab *)') : undefined
    }"
    :class="{ 'stack-tab__maximum': maximum }"
  >
    <tab-header
      :space="space"
      :tab-transition="tabTransition"
      :tab-scroll-mode="tabScrollMode"
      :contextmenu="contextmenu"
      :max="max"
      @active="onTabActive"
    >
      <template #leftButton>
        <slot name="leftButton" />
      </template>
      <template #rightButton>
        <slot name="rightButton" />
      </template>
    </tab-header>
    <div class="stack-tab__container">
      <div
        :id="activeNonIframeTab ? getStackTabPanelId(activeNonIframeTab.id) : undefined"
        :hidden="!hasActiveNonIframeTab"
        class="stack-tab__keep-alive-panel"
        :role="activeNonIframeTab ? 'tabpanel' : undefined"
        :aria-labelledby="activeNonIframeTab ? getStackTabTabId(activeNonIframeTab.id) : undefined"
        :aria-hidden="activeNonIframeTab ? undefined : 'true'"
      >
        <StackKeepAlive :transition-name="pageSwitch" @loaded="onComponentLoaded" />
      </div>
      <div class="stack-tab__iframes">
        <Transition
          v-for="frame of iframeTabs"
          :key="getIframeKey(frame)"
          :name="pageTransition"
          appear
        >
          <div
            v-show="frame.active"
            :id="getStackTabPanelId(frame.id)"
            :key="getIframeKey(frame)"
            class="stack-tab__iframe-wrapper"
            role="tabpanel"
            :aria-labelledby="getStackTabTabId(frame.id)"
          >
            <div
              v-if="shouldShowIframeLoading(frame.id)"
              class="stack-tab__iframe-loading"
              role="status"
              aria-live="polite"
              :aria-label="t('VueStackTab.loading')"
            >
              <slot name="iframeLoading" :tab="frame">
                <span class="stack-tab__iframe-loading-text">{{ t('VueStackTab.loading') }}</span>
              </slot>
            </div>
            <div v-if="shouldShowIframeError(frame.id)" class="stack-tab__iframe-error" role="alert">
              <slot name="iframeError" :tab="frame" :retry="retryIframe">
                <span class="stack-tab__iframe-error-text">
                  {{ getIframeLoadState(frame.id).message ?? t('VueStackTab.iframeLoadTimeout') }}
                </span>
                <button
                  type="button"
                  class="stack-tab__iframe-error-retry"
                  @click="retryIframe(frame.id)"
                >
                  {{ t('VueStackTab.retry') }}
                </button>
                <button
                  v-if="frame.url && isAllowedTabUrl(frame.url)"
                  type="button"
                  class="stack-tab__iframe-error-open"
                  @click="openInNewWindow(frame.id)"
                >
                  {{ t('VueStackTab.openInNewWindow') }}
                </button>
              </slot>
            </div>
            <iframe
              :ref="(el) => setIframeRef(frame.id, el as HTMLIFrameElement | null)"
              class="stack-tab__iframe"
              :src="getIframeSrc(frame, getIframeRefreshKey(frame.id))"
              :data-refresh-key="getIframeRefreshKey(frame.id)"
              :title="frame.title || t('VueStackTab.iframeTitle') || 'Stack tab iframe'"
              :sandbox="iframeSandbox || undefined"
              :referrerpolicy="iframeReferrerPolicy"
              :allow="iframeAllow || undefined"
              frameborder="0"
              @load="handleIframeLoad(frame, $event)"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
<style scoped></style>
