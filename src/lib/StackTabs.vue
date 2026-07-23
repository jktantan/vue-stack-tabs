<!--
  StackTabs - 堆叠式标签页主组件

  职责：
  - 标签页容器，集成 TabHeader、router-view、keep-alive、iframe 展示
  - 包裹在 router-view 外层，将路由渲染到对应标签的缓存页面中

  数据流：
  - useTabPanel：tabs、缓存列表与页面级刷新版本
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
  ref,
  watch
} from 'vue'
import type { TransitionProps } from 'vue'
import { getMaxZIndex } from './utils/scrollUtils'
import { isAllowedTabUrl } from './utils/urlParser'
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
import { getStackTabPanelId, getStackTabTabId } from './utils/stackTabsA11y'
import { useIframeManager } from './hooks/useIframeManager'
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
    defaultTabs?: ITabData[]
    max?: number
    contextmenu?: boolean | object
    pageTransition?: string
    pageTransitionBack?: string
    tabTransition?: string | TransitionProps
    tabScrollMode?: TabScrollMode
    width?: string
    height?: string
    i18n?: string
    space?: number
    globalScroll?: boolean
    iframePath: string
    sessionPrefix?: string
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
const maximum = ref<boolean>(false)
const maximumZIndex = ref<number>()
if (isRuntimeContextOwner) {
  provide(maximumKey, maximum)
}
watch(maximum, (isMaximum) => {
  maximumZIndex.value = isMaximum ? getMaxZIndex('body *:not(.stack-tab,.stack-tab *)') : undefined
})
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

const onTabActive = (id: string) => {
  emit('onActive', id)
}
const onComponentLoaded = () => {
  emit('onPageLoaded')
}

const pageSwitch = ref<string>(props.pageTransition)
const emitter = runtimeContext.eventBus
const forwardHandler = () => {
  pageSwitch.value = props.pageTransition
}
const backwardHandler = () => {
  pageSwitch.value = props.pageTransitionBack
}
if (isRuntimeContextOwner) {
  emitter.on(TabEventType.FORWARD, forwardHandler)
  emitter.on(TabEventType.BACKWARD, backwardHandler)
}

const {
  iframeTabs,
  activeNonIframeTab,
  hasActiveNonIframeTab,
  iframeSrcMap,
  getIframeRefreshKey,
  getIframeKey,
  getIframeLoadState,
  shouldShowIframeLoading,
  shouldShowIframeError,
  retryIframe,
  setIframeRef,
  handleIframeLoad,
  handleRefreshIframePostMessage,
  createMessageHandler
} = useIframeManager({
  tabs,
  iframeRefreshKeys,
  iframeLoadTimeout: props.iframeLoadTimeout,
  t
})

const allowedOrigins = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const extra = props.iframeAllowedOrigins ?? []
  return [origin, ...extra].filter(Boolean)
})
const handleMessage = createMessageHandler(allowedOrigins, openTab)

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
      'z-index': maximumZIndex
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
      <Transition :name="pageSwitch" appear>
        <div
          v-show="hasActiveNonIframeTab"
          :id="activeNonIframeTab ? getStackTabPanelId(activeNonIframeTab.id) : undefined"
          :key="'keep-alive'"
          class="stack-tab__keep-alive-panel"
          :role="activeNonIframeTab ? 'tabpanel' : undefined"
          :aria-labelledby="
            activeNonIframeTab ? getStackTabTabId(activeNonIframeTab.id) : undefined
          "
          :aria-hidden="activeNonIframeTab ? undefined : 'true'"
        >
          <StackKeepAlive :transition-name="pageSwitch" @loaded="onComponentLoaded" />
        </div>
      </Transition>
      <div class="stack-tab__iframes">
        <Transition
          v-for="frame of iframeTabs"
          :key="getIframeKey(frame)"
          :name="pageSwitch"
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
            <div
              v-if="shouldShowIframeError(frame.id)"
              class="stack-tab__iframe-error"
              role="alert"
            >
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
              :src="iframeSrcMap[frame.id] || 'about:blank'"
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
