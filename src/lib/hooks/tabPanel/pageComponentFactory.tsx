/**
 * 页面缓存组件工厂。
 *
 * 将 keep-alive 包装、VNode 注入和页面激活生命周期从 tab 状态编排中隔离，
 * 使 useTabPanel 只负责领域状态与路由协调。
 */
import {
  cloneVNode,
  computed,
  defineComponent,
  h,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  watch
} from 'vue'
import type { DefineComponent, PropType, VNode } from 'vue'
import type { ITabBase } from '../../model/TabModel'
import {
  readAdapterScrollMetrics,
  resolveScrollAdapter,
  type StackTabsScrollAdapter
} from '../../model/ScrollAdapter'
import PageLoading from '../../components/PageLoading.vue'
import type { StackTabsRuntimeContext } from '../stackTabsContext'
import { tabPageContextKey } from '../tabPageContext'
import { tabScrollShadowKey, type TabScrollShadowState } from '../tabScrollShadowContext'
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
  setPageScrollAdapter: (
    pageId: string,
    getter: (() => StackTabsScrollAdapter | null) | null
  ) => void
  saveScroller: (pageId: string) => void
  recordMainScroller: (pageId: string) => void
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
    setPageScrollAdapter,
    saveScroller,
    recordMainScroller,
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
        // 页面上下文只在缓存包装组件这一层 provide，页面组件及其嵌套组件都可 inject。
        // 不再把 tId / pId 作为 attrs 注入页面：多根节点页面会触发 Vue 的
        // “Extraneous non-props attributes”警告，单根节点页面则会把内部 ID 透传到 DOM。
        provide(tabPageContextKey, {
          tabId: tabInfo.id!,
          pageId: cacheName
        })

        const localBackParams = ref<Record<string, unknown> | null>(null)
        const lastVnode = shallowRef<VNode | null | undefined>(null)
        const lastCloned = shallowRef<VNode | null>(null)
        const lastBackParams = shallowRef<Record<string, unknown> | null>(null)
        const pageRoot = ref<HTMLElement | null>(null)
        /** 自定义滚动组件的实例（expose proxy），用于解析滚动适配器。 */
        const scrollContainerRef = ref<unknown>(null)
        const customScrollAdapter = shallowRef<StackTabsScrollAdapter | null>(null)
        /** 页面级手动开关；null 表示回退到 StackTabs 的全局配置。 */
        const shadowEnabledOverride = ref<boolean | null>(null)
        /**
         * 实际渲染的刷新版本。
         *
         * 刷新时先把 wrapper（真实元素，兼容多根节点页面）作为动画主体执行离场，
         * 离场结束再提升该值重建页面，最后执行入场；因此它会短暂落后于
         * props.refreshVersion。外层 keep-alive key 保持不变，避免实例累积。
         */
        const renderedRefreshVersion = ref(props.refreshVersion ?? 0)

        const hasCustomScrollContainer = (): boolean =>
          Boolean(runtimeContext.scrollContainer.value)

        /**
         * 当前页面的主滚动适配器。
         *
         * 未传 `scrollContainer` 时把 wrapper 本身当作适配器，默认路径行为保持不变；
         * 传入时读取自定义组件 expose 的能力，解析不到则按「无滚动容器」处理。
         */
        const getScrollAdapter = (): StackTabsScrollAdapter | null => {
          if (!hasCustomScrollContainer()) {
            return pageRoot.value ? { scrollElement: pageRoot.value } : null
          }
          return customScrollAdapter.value
        }

        /** 重新解析自定义滚动组件的适配器（运行时切换容器后也会调用）。 */
        const syncScrollAdapter = (): void => {
          customScrollAdapter.value = hasCustomScrollContainer()
            ? resolveScrollAdapter(scrollContainerRef.value)
            : null
        }

        /** 阴影订阅：优先用适配器的 onScroll，缺失时监听原生滚动元素。 */
        const subscribeAdapterScroll = (listener: () => void): (() => void) => {
          const adapter = getScrollAdapter()
          // keep-alive 停用会先把 DOM 移入隐藏容器、让 scrollTop 归零，
          // 因此滚动过程中就要记录位置，不能等到 onDeactivated 再读 DOM。
          const handleScroll = () => {
            recordMainScroller(cacheName)
            listener()
          }
          if (adapter?.onScroll) return adapter.onScroll(handleScroll)
          const element = adapter?.scrollElement
          if (!element) return () => undefined
          element.addEventListener('scroll', handleScroll, { passive: true })
          return () => element.removeEventListener('scroll', handleScroll)
        }

        // 阴影类挂到不被刷新动画 transform 的 panel 上；滚动监听绑定真实滚动元素。
        // 否则 ::after 的绝对定位包含块会随 transform 变化，顶部阴影会错位/消失。
        const scrollShadow = useScrollShadow({
          target: () => getScrollAdapter()?.scrollElement ?? null,
          classTarget: () => pageRoot.value?.parentElement ?? null,
          getMetrics: () => readAdapterScrollMetrics(getScrollAdapter()),
          onScroll: subscribeAdapterScroll,
          // 页面级开关优先；未设置时跟随 StackTabs 的全局配置。
          enabled: () => shadowEnabledOverride.value ?? runtimeContext.scrollShadow.value
        })

        const shadowEnabled = computed(
          () => shadowEnabledOverride.value ?? runtimeContext.scrollShadow.value
        )
        const shadowStateListeners = new Set<(state: TabScrollShadowState) => void>()

        /** 手动设置当前页是否显示阴影；状态仍会继续计算。 */
        const setShadowEnabled = (enabled: boolean): void => {
          shadowEnabledOverride.value = enabled
          scrollShadow.sync()
        }

        /** 清除手动开关，回退到全局配置。 */
        const resetShadowEnabled = (): void => {
          shadowEnabledOverride.value = null
          scrollShadow.sync()
        }

        const onShadowStateChange = (
          listener: (state: TabScrollShadowState) => void
        ): (() => void) => {
          shadowStateListeners.add(listener)
          return () => shadowStateListeners.delete(listener)
        }

        // 状态广播给页面内的订阅者；响应式 `state` 仍然可以直接 watch。
        watch(scrollShadow.state, (next) => {
          for (const listener of shadowStateListeners) listener(next)
        })

        // 页面内任意层级的组件都可以通过 useTabScrollShadow() 注入这份控制器。
        provide(tabScrollShadowKey, {
          state: scrollShadow.state,
          enabled: shadowEnabled,
          setEnabled: setShadowEnabled,
          reset: resetShadowEnabled,
          getState: () => scrollShadow.state.value,
          onStateChange: onShadowStateChange
        })

        /**
         * 同步主滚动容器的注册方式：
         * - 默认路径：保持 `#W-<cacheName>` 选择器，行为与旧版本一致；
         * - 自定义路径：改用适配器读写位置，跳过 wrapper 的注册。
         */
        const syncScrollRegistration = (): void => {
          if (hasCustomScrollContainer()) {
            setPageScrollAdapter(cacheName, () => customScrollAdapter.value)
            return
          }
          addPageScroller(cacheName, `#W-${cacheName}`)
          setPageScrollAdapter(cacheName, null)
        }

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
          syncScrollRegistration()
          syncScrollAdapter()
          // 新页面经 Transition(out-in) 挂载时，setup 后的 microtask 可能早于 ref 赋值；
          // 挂载后重新 sync，确保 scroll shadow 监听与阴影类目标正确绑定。
          scrollShadow.sync(true)
          checkAndConsumeBackParams()

          // 自定义滚动组件可能异步加载（异步组件 / Suspense），首帧尚未 expose。
          // 下一 tick 再解析一次；首次解析成功时补一次位置恢复。
          void nextTick(() => {
            if (refreshDisposed) return
            const wasResolved = Boolean(customScrollAdapter.value)
            syncScrollAdapter()
            if (!wasResolved && customScrollAdapter.value) restoreScroller(cacheName)
            scrollShadow.sync(true)
          })
        })
        onDeactivated(() => {
          scrollShadow.clear()
          saveScroller(cacheName)
        })
        onActivated(() => {
          context.emit('onLoaded')
          syncScrollAdapter()
          restoreScroller(cacheName)
          scrollShadow.sync(true)
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
        onUnmounted(() => {
          shadowStateListeners.clear()
          removeScroller(cacheName)
        })

        // 运行时切换全局阴影开关：立即重算，不需要重建缓存页。
        watch(
          () => runtimeContext.scrollShadow.value,
          () => scrollShadow.sync()
        )

        // 运行时切换滚动组件：只重新解析适配器并重新同步阴影，不重建缓存页。
        watch(
          () => runtimeContext.scrollContainer.value,
          () => {
            // 切换前保存旧容器的主滚动位置，切换后由新容器 / 默认 wrapper 恢复。
            saveScroller(cacheName)
            void nextTick(() => {
              if (refreshDisposed) return
              syncScrollRegistration()
              syncScrollAdapter()
              restoreScroller(cacheName)
              scrollShadow.sync(true)
            })
          }
        )

        return () => {
          const vnode = props.vnode
          const backParams = localBackParams.value
          if (vnode !== lastVnode.value || backParams !== lastBackParams.value) {
            // _back 是页面需要读取的公开 prop，仍通过 cloneVNode 注入；
            // tId / pId 已改为 provide/inject，不再污染页面 attrs。
            lastCloned.value = vnode
              ? cloneVNode(vnode, backParams ? { _back: backParams } : null)
              : null
            lastVnode.value = vnode
            lastBackParams.value = backParams
          }

          const scrollContainer = runtimeContext.scrollContainer.value
          const pageContent = lastCloned.value ? (
            <PageShell
              key={`${cacheName}-${renderedRefreshVersion.value}`}
              vnode={lastCloned.value}
            />
          ) : null

          return (
            <div
              ref={pageRoot}
              class="stack-tab__cache-page-wrapper"
              id={`W-${cacheName}`}
              style={[
                // 自定义滚动容器优先：wrapper 不再承担滚动，避免出现两层滚动条。
                // 动画作用于 wrapper 本身，页面内容不会相对滚动容器位移，
                // 因此无需临时隐藏 overflow，避免动画期间滚动条消失导致内容宽度跳动。
                !scrollContainer && runtimeContext.useGlobalScroll.value
                  ? 'overflow:auto'
                  : 'overflow:hidden',
                'height: 100%'
              ]}
            >
              {scrollContainer
                ? h(scrollContainer, { ref: scrollContainerRef }, { default: () => pageContent })
                : pageContent}
              {/* PageLoading 必须在滚动容器外层：它是覆盖整个内容区的遮罩。 */}
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
