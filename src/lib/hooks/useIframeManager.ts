/**
 * iframe 标签页生命周期管理。
 *
 * 统一管理所有 iframe 标签的 src 计算、加载状态追踪、超时检测、
 * 刷新控制、DOM ref 收集，以及 postMessage 通信。
 */
import { computed, onBeforeUnmount, reactive, watch, type Ref } from 'vue'
import type { ITabItem } from '../model/TabModel'
import { isAllowedTabUrl, toSafeTabUrl } from '../utils/urlParser'
import { getPostMessageTargetOrigin, isStackTabsOpenTabMessage } from '../utils/stackTabsMessage'

type IframeLoadStatus = 'idle' | 'loading' | 'loaded' | 'timeout'

interface IframeLoadState {
  status: IframeLoadStatus
  message?: string
}

export interface UseIframeManagerOptions {
  tabs: Ref<ITabItem[]>
  iframeRefreshKeys: Ref<Record<string, number>>
  iframeLoadTimeout: number
  t: (key: string) => string
}

export function useIframeManager(options: UseIframeManagerOptions) {
  const { tabs, iframeRefreshKeys, iframeLoadTimeout, t } = options

  const iframeTabs = computed(() => tabs.value.filter((item) => item.iframe))
  const activeNonIframeTab = computed(() => tabs.value.find((item) => item.active && !item.iframe))
  const hasActiveNonIframeTab = computed(() => Boolean(activeNonIframeTab.value))

  // iframe 首次激活时才加载真实 URL，未激活前使用 about:blank 避免不必要的请求
  const iframeEverActivated = reactive<Record<string, boolean>>({})
  const activeIframesWithUrl = computed(() =>
    iframeTabs.value.filter((f) => f.active && (f.url ?? '') && isAllowedTabUrl(f.url ?? ''))
  )

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
  const getIframeSrc = (
    frame: { id: string; url?: string },
    refreshKey = getIframeRefreshKey(frame.id)
  ) => {
    const safeUrl = toSafeTabUrl(frame.url ?? '')
    const src = iframeEverActivated[frame.id] ? safeUrl : 'about:blank'
    return appendIframeRefreshKey(src, refreshKey)
  }

  const getIframeKey = (frame: { id: string }) => `${frame.id}-${getIframeRefreshKey(frame.id)}`

  const iframeSrcMap = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const frame of iframeTabs.value) {
      const refreshKey = getIframeRefreshKey(frame.id)
      map[frame.id] = getIframeSrc(frame, refreshKey)
    }
    return map
  })

  const iframeLoadStates = reactive<Record<string, IframeLoadState>>({})
  const getIframeLoadState = (frameId: string): IframeLoadState =>
    iframeLoadStates[frameId] ?? { status: 'idle' }

  const loadTimeoutIds = new Map<string, ReturnType<typeof setTimeout>>()

  const clearIframeLoadTimeout = (frameId: string) => {
    const timeoutId = loadTimeoutIds.get(frameId)
    if (!timeoutId) return
    clearTimeout(timeoutId)
    loadTimeoutIds.delete(frameId)
  }

  const setIframeLoaded = (frameId: string) => {
    clearIframeLoadTimeout(frameId)
    iframeLoadStates[frameId] = { status: 'loaded' }
  }

  const setIframeLoading = (frameId: string, opts: { force?: boolean } = {}) => {
    const current = getIframeLoadState(frameId)
    if (current.status === 'loaded' && !opts.force) return

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
      }, iframeLoadTimeout)
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

  const shouldShowIframeLoading = (frameId: string) =>
    getIframeLoadState(frameId).status === 'loading'
  const shouldShowIframeError = (frameId: string) =>
    getIframeLoadState(frameId).status === 'timeout'

  const iframeElRefs = reactive<Record<string, HTMLIFrameElement | null>>({})
  const setIframeRef = (id: string, el: HTMLIFrameElement | null) => {
    if (el) {
      iframeElRefs[id] = el
    } else {
      delete iframeElRefs[id]
    }
  }

  // 当 iframe 标签首次变为 active 时，标记为已激活并开始跟踪加载状态
  watch(
    iframeTabs,
    (frames) => {
      for (const f of frames) {
        if (!f.active) continue
        iframeEverActivated[f.id] = true
        setIframeLoading(f.id)
      }
    },
    { immediate: true }
  )

  // refreshKey 变化时重新触发对应 iframe 的加载状态
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

  // 标签关闭时清理对应 iframe 的加载状态、激活记录和 DOM 引用
  watch(
    iframeTabs,
    (frames, oldFrames) => {
      if (oldFrames && frames.length < oldFrames.length) {
        const activeIds = new Set(frames.map((frame) => frame.id))
        const removedFrames = oldFrames.filter((f) => !activeIds.has(f.id))
        for (const removed of removedFrames) {
          const id = removed.id
          clearIframeLoadTimeout(id)
          delete iframeLoadStates[id]
          delete iframeEverActivated[id]
          delete iframeElRefs[id]
        }
      } else if (!oldFrames) {
        const activeIds = new Set(frames.map((frame) => frame.id))
        for (const id of Object.keys(iframeLoadStates)) {
          if (!activeIds.has(id)) {
            clearIframeLoadTimeout(id)
            delete iframeLoadStates[id]
            delete iframeEverActivated[id]
            delete iframeElRefs[id]
          }
        }
      }
    },
    { immediate: true }
  )

  const handleIframeLoad = (frame: { id: string; url?: string }, event: Event) => {
    const iframe = event.currentTarget as HTMLIFrameElement | null
    const refreshKey = Number(iframe?.dataset.refreshKey ?? 0)
    if (!iframeEverActivated[frame.id]) return
    if (getIframeSrc(frame, refreshKey) === 'about:blank') return
    if (refreshKey !== getIframeRefreshKey(frame.id)) return
    if (iframe !== iframeElRefs[frame.id]) return
    setIframeLoaded(frame.id)
  }

  const handleRefreshIframePostMessage = (tabId: string) => {
    const iframe = iframeElRefs[tabId]
    const tab = tabs.value.find((item) => item.id === tabId)
    if (iframe?.contentWindow) {
      try {
        const targetOrigin = getPostMessageTargetOrigin(tab?.url ?? '')
        if (!targetOrigin) {
          if (!import.meta.env.PROD) {
            console.warn(
              `[vue-stack-tabs] Skip refresh postMessage because iframe URL is invalid: ${tabId}`
            )
          }
          return
        }
        iframe.contentWindow.postMessage({ type: 'vue-stack-tabs:refresh' }, targetOrigin)
      } catch (e) {
        if (!import.meta.env.PROD) {
          console.warn(`[vue-stack-tabs] Failed to send refresh postMessage to iframe: ${tabId}`, e)
        }
      }
    } else {
      if (!import.meta.env.PROD) {
        console.warn(
          `[vue-stack-tabs] IFrame element not found for tabId: ${tabId} when trying to refresh.`
        )
      }
    }
  }

  const createMessageHandler = (
    allowedOrigins: Ref<string[]>,
    openTab: (tab: any) => Promise<string | undefined>
  ) => {
    const isManagedIframeSource = (
      source: Parameters<typeof isStackTabsOpenTabMessage>[0]['source']
    ) => Object.values(iframeElRefs).some((el) => el?.contentWindow === source)

    return (ev: MessageEvent) => {
      if (!allowedOrigins.value.includes(ev.origin)) return

      const payload = isStackTabsOpenTabMessage(ev, isManagedIframeSource)
      if (!payload) return

      openTab(payload).catch((error: unknown) => {
        if (!import.meta.env.PROD) {
          console.warn('[vue-stack-tabs] Failed to open tab from iframe message:', error)
        }
      })
    }
  }

  onBeforeUnmount(() => {
    for (const timeoutId of loadTimeoutIds.values()) clearTimeout(timeoutId)
    loadTimeoutIds.clear()
  })

  return {
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
  }
}
