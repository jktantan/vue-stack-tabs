/**
 * 页面缓存组件工厂。
 *
 * 将 keep-alive 包装、VNode 注入和页面激活生命周期从 tab 状态编排中隔离，
 * 使 useTabPanel 只负责领域状态与路由协调。
 */
import {
  cloneVNode,
  defineComponent,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch
} from 'vue'
import type { DefineComponent, PropType, VNode } from 'vue'
import type { ITabBase } from '../../model/TabModel'
import PageLoading from '../../components/PageLoading.vue'
import type { StackTabsRuntimeContext } from '../stackTabsContext'
import { useScrollShadow } from '../useScrollShadow'

interface PageComponentFactoryOptions {
  runtimeContext: StackTabsRuntimeContext
  consumeBackParams: (tabId: string, pageId: string) => Record<string, unknown> | null
  getComponent: (id: string) => DefineComponent | undefined
  setComponent: (id: string, component: DefineComponent) => void
  addCache: (cacheName: string) => void
  evictMarkedCaches: () => void
  clearTabEvictionMarks: () => void
  addPageScroller: (pageId: string, ...selectors: string[]) => void
  saveScroller: (pageId: string) => void
  restoreScroller: (pageId: string) => void
  removeScroller: (pageId: string) => void
}

const parseTimeList = (value: string): number[] =>
  value.split(',').map((item) => Number.parseFloat(item.trim()) || 0)

/** 读取元素当前 transition 的总时长（秒转毫秒），用于等待离场/入场结束。 */
const getTransitionDurationMs = (element: HTMLElement): number => {
  if (typeof window === 'undefined') return 0
  const style = window.getComputedStyle(element)
  const durations = parseTimeList(style.transitionDuration || '0s')
  const delays = parseTimeList(style.transitionDelay || '0s')
  if (durations.length === 0) return 0
  return (
    Math.max(
      ...durations.map((duration, index) => duration + (delays[index % delays.length] ?? 0))
    ) * 1000
  )
}

/** 等待下一帧，让刚添加的 transition 起始样式先生效。 */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 16)
  })

/** 用户开启「减少动态效果」时直接切换页面，不执行转场。 */
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const createPageComponentFactory = (options: PageComponentFactoryOptions) => {
  const {
    runtimeContext,
    consumeBackParams,
    getComponent,
    setComponent,
    addCache,
    evictMarkedCaches,
    clearTabEvictionMarks,
    addPageScroller,
    saveScroller,
    restoreScroller,
    removeScroller
  } = options

  const resolvePageComponent = (ctx: { cacheName: string; tabInfo: ITabBase }): DefineComponent => {
    const { cacheName, tabInfo } = ctx
    const existing = getComponent(cacheName)
    if (existing) {
      addCache(cacheName)
      return existing
    }

    /**
     * 页面壳组件：承接刷新时的 key 变化，让页面重建发生在缓存 wrapper 内部，
     * 避免直接修改 router-view 页面 vnode 的 key 破坏 keep-alive 的实例复用。
     * 不额外渲染元素，页面可以是单根，也可以是多根节点（Fragment）。
     */
    const PageShell = defineComponent({
      name: `${cacheName}-shell`,
      props: {
        vnode: {
          type: Object as PropType<VNode | null>,
          required: false,
          default: null
        }
      },
      setup(props) {
        return () => props.vnode
      }
    })

    const cacheComponent = defineComponent<{
      vnode?: VNode
      refreshVersion?: number
      transitionName?: string
    }>({
      name: cacheName,
      props: {
        vnode: {
          type: Object as PropType<VNode>,
          required: false,
          default: undefined
        },
        /**
         * 页面级刷新版本。外层 keep-alive 的 key 保持稳定（避免旧实例滞留缓存），
         * 刷新时只让内部页面 vnode 的 key 变化，从而重建页面组件而保留包装层与滚动位置。
         */
        refreshVersion: {
          type: Number,
          required: false,
          default: 0
        },
        /** 页面转场名，与 StackKeepAlive 外层 Transition 保持一致 */
        transitionName: {
          type: String,
          required: false,
          default: ''
        }
      },
      emits: ['onLoaded'],
      setup(props, context) {
        const localBackParams = ref<Record<string, unknown> | null>(null)
        const lastVnode = shallowRef<VNode | null | undefined>(null)
        const lastCloned = shallowRef<VNode | null>(null)
        const lastBackParams = shallowRef<Record<string, unknown> | null>(null)
        const pageRoot = ref<HTMLElement | null>(null)
        /**
         * 实际渲染的刷新版本。
         *
         * 刷新时先把 wrapper（真实元素，兼容多根节点页面）作为动画主体执行离场，
         * 离场结束再提升该值重建页面，最后执行入场；因此它会短暂落后于
         * props.refreshVersion。外层 keep-alive key 保持不变，避免实例累积。
         */
        const renderedRefreshVersion = ref(props.refreshVersion ?? 0)

        let refreshDisposed = false
        let isFlushingRefresh = false
        let queuedRefreshVersion: number | null = null
        let refreshTimer: ReturnType<typeof setTimeout> | null = null
        let cancelRefreshWait: (() => void) | null = null
        let appliedTransitionName = ''

        const clearRefreshTimer = () => {
          if (refreshTimer === null) return
          clearTimeout(refreshTimer)
          refreshTimer = null
        }

        const removeRefreshClasses = () => {
          const element = pageRoot.value
          const name = appliedTransitionName
          if (!element || !name) return
          element.classList.remove(
            `${name}-leave-active`,
            `${name}-leave-to`,
            `${name}-enter-active`,
            `${name}-enter-from`
          )
          appliedTransitionName = ''
        }

        /**
         * 等待一段 transition 结束；transitionend 不可用时用时长兜底。
         * 元素可能同时有多个过渡属性（opacity / transform），任意一个结束即可。
         */
        const waitForRefreshEnd = (duration: number): Promise<void> =>
          new Promise((resolve) => {
            const element = pageRoot.value
            if (!element || duration <= 0) {
              resolve()
              return
            }
            let settled = false
            const finish = () => {
              if (settled) return
              settled = true
              cancelRefreshWait = null
              clearRefreshTimer()
              element.removeEventListener('transitionend', handleEnd)
              resolve()
            }
            const handleEnd = (event: TransitionEvent) => {
              if (event.target === element) finish()
            }
            cancelRefreshWait = finish
            element.addEventListener('transitionend', handleEnd)
            refreshTimer = setTimeout(finish, duration + 80)
          })

        /**
         * 执行一次完整的刷新转场：旧内容离场 → 提升版本重建页面 → 新内容入场。
         *
         * 动画类名沿用 Vue Transition 的约定（`${name}-leave-active` 等），
         * 因此自定义页面过渡 CSS 仍然有效；动画主体是缓存 wrapper 本身，
         * 页面是单根还是多根（Fragment）都不影响。
         */
        const runRefreshAnimation = async (targetVersion: number): Promise<void> => {
          const element = pageRoot.value
          const name = props.transitionName
          if (!element || !name || prefersReducedMotion()) {
            renderedRefreshVersion.value = targetVersion
            return
          }

          appliedTransitionName = name
          element.classList.add(`${name}-leave-active`)
          const leaveDuration = getTransitionDurationMs(element)
          if (leaveDuration <= 0) {
            removeRefreshClasses()
            renderedRefreshVersion.value = targetVersion
            return
          }

          // 先让 leave-active 生效，再添加 leave-to，触发离场过渡。
          await nextFrame()
          if (refreshDisposed) {
            removeRefreshClasses()
            return
          }
          element.classList.add(`${name}-leave-to`)
          await waitForRefreshEnd(leaveDuration)
          removeRefreshClasses()
          if (refreshDisposed) return

          renderedRefreshVersion.value = targetVersion
          await nextTick()
          if (refreshDisposed) return

          appliedTransitionName = name
          // 先把元素落到入场起点（不加 transition，避免从离场终点反向缓动），
          // 再启用 enter-active，下一帧移除 enter-from，形成标准的入场过渡。
          element.classList.add(`${name}-enter-from`)
          void element.offsetWidth
          element.classList.add(`${name}-enter-active`)
          const enterDuration = getTransitionDurationMs(element)
          if (enterDuration <= 0) {
            removeRefreshClasses()
            return
          }

          await nextFrame()
          if (refreshDisposed) {
            removeRefreshClasses()
            return
          }
          element.classList.remove(`${name}-enter-from`)
          await waitForRefreshEnd(enterDuration)
          removeRefreshClasses()
        }

        const flushRefreshQueue = async (): Promise<void> => {
          if (isFlushingRefresh) return
          isFlushingRefresh = true
          try {
            while (!refreshDisposed && queuedRefreshVersion !== null) {
              const targetVersion = queuedRefreshVersion
              queuedRefreshVersion = null
              if (targetVersion === renderedRefreshVersion.value) continue
              await runRefreshAnimation(targetVersion)
            }
          } finally {
            isFlushingRefresh = false
          }
        }

        watch(
          () => props.refreshVersion ?? 0,
          (nextVersion) => {
            if (nextVersion === renderedRefreshVersion.value && queuedRefreshVersion === null)
              return
            queuedRefreshVersion = nextVersion
            void flushRefreshQueue()
          }
        )

        const checkAndConsumeBackParams = () => {
          localBackParams.value = consumeBackParams(tabInfo.id!, cacheName)
        }

        onMounted(() => {
          context.emit('onLoaded')
          addPageScroller(cacheName, `#W-${cacheName}`)
          // 新页面经 Transition(out-in) 挂载时，setup 后的 microtask 可能早于 ref 赋值；
          // 挂载后重新 sync，确保 scroll shadow 监听与阴影类目标正确绑定。
          scrollShadow.sync()
          checkAndConsumeBackParams()
        })
        onDeactivated(() => {
          scrollShadow.clear()
          saveScroller(cacheName)
        })
        onActivated(() => {
          context.emit('onLoaded')
          restoreScroller(cacheName)
          scrollShadow.sync()
          evictMarkedCaches()
          clearTabEvictionMarks()
          checkAndConsumeBackParams()
        })
        onBeforeUnmount(() => {
          refreshDisposed = true
          queuedRefreshVersion = null
          cancelRefreshWait?.()
          clearRefreshTimer()
          removeRefreshClasses()
        })
        onUnmounted(() => removeScroller(cacheName))

        // 阴影类挂到不被刷新动画 transform 的 panel 上；滚动监听仍绑定 wrapper。
        // 否则 ::after 的绝对定位包含块会随 transform 变化，顶部阴影会错位/消失。
        const scrollShadow = useScrollShadow({
          target: pageRoot,
          classTarget: () => pageRoot.value?.parentElement ?? null
        })

        return () => {
          const vnode = props.vnode
          const backParams = localBackParams.value
          if (vnode !== lastVnode.value || backParams !== lastBackParams.value) {
            lastCloned.value = vnode
              ? cloneVNode(vnode, {
                  tId: tabInfo.id,
                  pId: cacheName,
                  ...(backParams ? { _back: backParams } : {})
                })
              : null
            lastVnode.value = vnode
            lastBackParams.value = backParams
          }

          return (
            <div
              ref={pageRoot}
              class="stack-tab__cache-page-wrapper"
              id={`W-${cacheName}`}
              style={[
                // 动画作用于 wrapper 本身，页面内容不会相对滚动容器位移，
                // 因此无需临时隐藏 overflow，避免动画期间滚动条消失导致内容宽度跳动。
                runtimeContext.useGlobalScroll.value ? 'overflow:auto' : 'overflow:hidden',
                'height: 100%'
              ]}
            >
              {lastCloned.value ? (
                <PageShell
                  key={`${cacheName}-${renderedRefreshVersion.value}`}
                  vnode={lastCloned.value}
                />
              ) : null}
              <PageLoading tabId={tabInfo.id!} />
            </div>
          )
        }
      }
    }) as DefineComponent
    setComponent(cacheName, cacheComponent)
    addCache(cacheName)
    return cacheComponent
  }

  return { resolvePageComponent }
}
