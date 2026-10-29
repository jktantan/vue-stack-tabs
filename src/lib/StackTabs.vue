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
  toRef,
  watch
} from 'vue'
import type { TransitionProps } from 'vue'
import { getMaxZIndex, invalidateZIndexCache } from './utils/scrollUtils'
import { isAllowedTabUrl } from './utils/urlParser'
import { applyStackTabsLocale } from './i18n/stackTabsLocale'
import { type ITabData, TabScrollMode } from './model/TabModel'
import type { StackTabsPageScroll } from './model/PageScroll'
import type { TabScrollShadowConfig } from './hooks/tabScrollShadowContext'
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
    /** 初始标签列表，仅在组件挂载时使用 / Initial tab list, applied when the component mounts */
    defaultTabs?: ITabData[]
    /**
     * 固定首页：始终位于第一位、不可关闭、不可移动，其他标签也不能排到它前面。
     * Fixed home tab: always first, cannot be closed or moved, and other tabs cannot precede it.
     */
    homeTab?: ITabData
    /** 标签页最大数量，默认 20 / Maximum number of tabs (default: 20) */
    max?: number
    /**
     * 是否启用右键菜单，或传入自定义菜单项数组，默认 true。
     * Enables the context menu, or pass a custom menu item array (default: true).
     */
    contextmenu?: boolean | object
    /**
     * 前进时的页面切换过渡动画名称，默认 `stack-tab-swap`。
     * Page transition name when navigating forward (default: `stack-tab-swap`).
     */
    pageTransition?: string
    /**
     * 后退时的页面切换过渡动画名称，默认 `stack-tab-swap-back`。
     * Page transition name when navigating back (default: `stack-tab-swap-back`).
     */
    pageTransitionBack?: string
    /**
     * 标签切换过渡动画：可传动画名称，或完整的 TransitionProps，默认 `stack-tab-zoom`。
     * Tab transition: an animation name or full TransitionProps (default: `stack-tab-zoom`).
     */
    tabTransition?: string | TransitionProps
    /**
     * 标签栏的滚动模式（滚轮 / 按钮 / 两者都支持），默认 `TabScrollMode.BOTH`。
     * Tab bar scroll mode (wheel / buttons / both), defaults to `TabScrollMode.BOTH`.
     */
    tabScrollMode?: TabScrollMode
    /** 组件容器宽度，默认 `100%` / Container width (default: `100%`) */
    width?: string
    /** 组件容器高度，默认 `100%` / Container height (default: `100%`) */
    height?: string
    /**
     * 界面语言，如 `zh-CN`、`en`；不传时跟随库的默认语言。
     * UI locale, e.g. `zh-CN` or `en`; falls back to the library default when omitted.
     */
    i18n?: string
    /**
     * 标签栏滚动一次移动的距离（px），默认 300。
     * Distance (px) the tab bar scrolls per step (default: 300).
     */
    space?: number
    /**
     * 内容区滚动策略：
     * - `'native'`：由库内 wrapper 使用原生滚动；
     * - `'none'`：库不接管滚动，由页面自己处理；
     * - `Component`：由传入的滚动组件接管。
     *
     * 默认 `'none'`。
     *
     * Content scroll strategy:
     * - `'native'`: the internal wrapper uses native scrolling;
     * - `'none'`: the library does not handle scrolling; the page does;
     * - `Component`: a custom scroll component takes over.
     *
     * Defaults to `'none'`.
     */
    pageScroll?: StackTabsPageScroll
    /**
     * 内容区上下阴影开关（默认 true）。
     * 传 `false` 同时关闭两侧；传对象可单独关闭某一侧，例如 `{ top: false }`。
     * 页面内组件还可以通过 `useTabScrollShadow().setEnabled()` 单独覆盖。
     * 对象需整体替换才会生效（直接修改对象属性不会触发更新）。
     *
     * Top/bottom shadow for the content area (default: true).
     * Pass `false` to disable both sides, or an object to disable one side, e.g. `{ top: false }`.
     * Components inside the page can override it via `useTabScrollShadow().setEnabled()`.
     * The object must be replaced as a whole (mutating a property does not trigger updates).
     */
    scrollShadow?: TabScrollShadowConfig
    /**
     * iframe 占位页路由路径，用作 iframe 标签的渲染入口（必填）。
     * Route path of the iframe placeholder page, used as the render entry for iframe tabs (required).
     */
    iframePath: string
    /**
     * 会话存储 key 前缀，用于区分不同应用实例，默认空字符串。
     * Prefix for session-storage keys to distinguish app instances (default: empty string).
     */
    sessionPrefix?: string
    /**
     * 允许与 iframe 通过 postMessage 通信的源列表，默认不允许任何源（空数组）。
     * Origins allowed to communicate with the iframe via postMessage (default: none).
     */
    iframeAllowedOrigins?: string[]
    /**
     * iframe 的 sandbox 属性，默认 `allow-scripts allow-forms allow-popups allow-downloads allow-same-origin`。
     * The iframe `sandbox` attribute (default: `allow-scripts allow-forms allow-popups allow-downloads allow-same-origin`).
     */
    iframeSandbox?: string
    /**
     * iframe 的 referrerpolicy 属性，默认 `strict-origin-when-cross-origin`。
     * The iframe `referrerpolicy` attribute (default: `strict-origin-when-cross-origin`).
     */
    iframeReferrerPolicy?: StackTabsIframeReferrerPolicy
    /** iframe 的 allow 属性（权限策略），默认空字符串 / The iframe `allow` attribute (default: empty) */
    iframeAllow?: string
    /**
     * iframe 加载超时时间（毫秒），超时后提示加载失败，默认 15000。
     * Iframe load timeout in milliseconds; a failure notice is shown after it (default: 15000).
     */
    iframeLoadTimeout?: number
  }>(),
  {
    defaultTabs: () => [],
    homeTab: undefined,
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
    pageScroll: 'none',
    scrollShadow: true,
    sessionPrefix: '',
    iframeAllowedOrigins: () => [],
    iframeSandbox: 'allow-scripts allow-forms allow-popups allow-downloads allow-same-origin',
    iframeReferrerPolicy: 'strict-origin-when-cross-origin' as StackTabsIframeReferrerPolicy,
    iframeAllow: '',
    iframeLoadTimeout: 15000
  }
)

// iframePath 必填：用于 iframe 占位页（StackTabs 把 iframe 标签路由到这个 path 渲染）。
// 这里在开发期给出明确错误，避免空字符串导致 router.push({ path: '' }) 跳到首页的隐式行为。
if (typeof props.iframePath !== 'string' || props.iframePath.trim() === '') {
  const message = '[vue-stack-tabs] <VueStackTabs> requires the "iframePath" prop (e.g. "/iframe").'
  if (!import.meta.env.PROD) {
    throw new Error(message)
  }
  console.error(message)
}

const { changeLocale, t } = useI18n()
const runtimeContext =
  inject(stackTabsContextKey, null) ??
  createStackTabsRuntimeContext({
    iframePath: props.iframePath,
    maxTabCount: props.max,
    pageScroll: props.pageScroll,
    scrollShadow: props.scrollShadow,
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
  // 最大化切换会显著改变 body 下元素层叠顺序，先失效缓存再读取避免过期结果。
  invalidateZIndexCache()
  maximumZIndex.value = isMaximum ? getMaxZIndex('body *:not(.stack-tab,.stack-tab *)') : undefined
})
const panelApi = isRuntimeContextOwner
  ? useTabPanel(runtimeContext)
  : {
      tabs: runtimeContext.tabs,
      iframeRefreshKeys: runtimeContext.iframeRefreshKeys,
      destroy: () => undefined,
      initialize: () => undefined,
      setMaxSize: () => undefined,
      setPageScroll: () => undefined,
      setSessionPrefix: () => undefined
    }
const {
  tabs,
  iframeRefreshKeys,
  destroy,
  initialize,
  setMaxSize,
  setPageScroll,
  setSessionPrefix
} = panelApi
const tabActions = isRuntimeContextOwner
  ? useTabActions(runtimeContext)
  : {
      setIFramePath: () => undefined,
      openTab: () => Promise.resolve(undefined),
      openInNewWindow: () => undefined
    }
const { setIFramePath, openTab, openInNewWindow } = tabActions
if (isRuntimeContextOwner) {
  setIFramePath(props.iframePath)
  setPageScroll(props.pageScroll)
  runtimeContext.scrollShadow.value = props.scrollShadow
  setMaxSize(props.max)
  applyStackTabsLocale(changeLocale, props.i18n)

  // 这些 props 在 setup 时写入运行时上下文；后续变化需要同步，
  // 否则调用方动态调整 max / 滚动模式 / session 前缀不会生效。
  watch(
    () => props.max,
    (value) => setMaxSize(value)
  )
  watch(
    () => props.pageScroll,
    (value) => setPageScroll(value)
  )
  watch(
    () => props.scrollShadow,
    (value) => {
      runtimeContext.scrollShadow.value = value
    }
  )
  watch(
    () => props.sessionPrefix,
    (value) => setSessionPrefix(value)
  )
  watch(
    () => props.i18n,
    (value) => applyStackTabsLocale(changeLocale, value)
  )
}

const onTabActive = (id: string) => {
  emit('onActive', id)
}
const onComponentLoaded = () => {
  emit('onPageLoaded')
}

const pageSwitch = ref<string>(props.pageTransition)
const emitter = runtimeContext.eventBus
// 动态修改过渡名时同步当前状态；事件驱动的 forward/backward 切换不会被覆盖。
watch(
  () => props.pageTransition,
  (value, previous) => {
    if (pageSwitch.value === previous) pageSwitch.value = value
  }
)
watch(
  () => props.pageTransitionBack,
  (value, previous) => {
    if (pageSwitch.value === previous) pageSwitch.value = value
  }
)
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
  // 传 ref 而不是快照，props 动态变化时超时时间立即生效。
  iframeLoadTimeout: toRef(props, 'iframeLoadTimeout'),
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
  initialize(props.defaultTabs, props.homeTab)
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
    :class="{ 'stack-tab--maximum': maximum }"
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
          :hidden="!hasActiveNonIframeTab"
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
