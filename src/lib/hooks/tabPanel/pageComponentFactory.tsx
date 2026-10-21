/**
 * 页面缓存组件工厂。
 *
 * 将 keep-alive 包装、VNode 注入和页面激活生命周期从 tab 状态编排中隔离，
 * 使 useTabPanel 只负责领域状态与路由协调。
 */
import {
  Transition,
  cloneVNode,
  defineComponent,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  shallowRef
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
     * 页面壳组件：作为 Transition 的直接子节点，承接刷新时的 key 变化，
     * 避免直接修改 router-view 页面 vnode 的 key 破坏 keep-alive 的实例复用。
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
        const lastRefreshVersion = shallowRef<number>(0)
        const pageRoot = ref<HTMLElement | null>(null)
        /**
         * 转场期间临时把 wrapper 的 overflow 锁为 hidden。
         * 内部 Transition 的 translateX 作用于页面根元素，若 wrapper 是 overflow:auto，
         * 位移会让内容短暂溢出并闪出滚动条。
         */
        const isTransitioning = ref(false)
        let transitionCount = 0
        const beginTransition = () => {
          transitionCount++
          isTransitioning.value = true
        }
        const endTransition = () => {
          transitionCount = Math.max(0, transitionCount - 1)
          if (transitionCount === 0) isTransitioning.value = false
        }

        const checkAndConsumeBackParams = () => {
          localBackParams.value = consumeBackParams(tabInfo.id!, cacheName)
        }

        onMounted(() => {
          context.emit('onLoaded')
          addPageScroller(cacheName, `#W-${cacheName}`)
          checkAndConsumeBackParams()
        })
        onDeactivated(() => saveScroller(cacheName))
        onActivated(() => {
          context.emit('onLoaded')
          restoreScroller(cacheName)
          evictMarkedCaches()
          clearTabEvictionMarks()
          checkAndConsumeBackParams()
        })
        onUnmounted(() => removeScroller(cacheName))

        // 给 .stack-tab__cache-page-wrapper 挂滚动阴影，确保 keep-alive 的 suspended/deactivated 生命周期下表现一致
        useScrollShadow({ target: pageRoot })

        return () => {
          const vnode = props.vnode
          const backParams = localBackParams.value
          const refreshVersion = props.refreshVersion ?? 0
          if (
            vnode !== lastVnode.value ||
            backParams !== lastBackParams.value ||
            refreshVersion !== lastRefreshVersion.value
          ) {
            const cloned = vnode
              ? cloneVNode(vnode, {
                  tId: tabInfo.id,
                  pId: cacheName,
                  ...(backParams ? { _back: backParams } : {})
                })
              : null
            lastCloned.value = cloned
            lastVnode.value = vnode
            lastBackParams.value = backParams
            lastRefreshVersion.value = refreshVersion
          }
          return (
            <div
              ref={pageRoot}
              class="stack-tab__cache-page-wrapper"
              id={`W-${cacheName}`}
              style={[
                runtimeContext.useGlobalScroll.value && !isTransitioning.value
                  ? 'overflow:auto'
                  : 'overflow:hidden',
                'height: 100%'
              ]}
            >
              {lastCloned.value ? (
                <Transition
                  name={props.transitionName}
                  mode="out-in"
                  onBeforeEnter={beginTransition}
                  onAfterEnter={endTransition}
                  onEnterCancelled={endTransition}
                  onBeforeLeave={beginTransition}
                  onAfterLeave={endTransition}
                  onLeaveCancelled={endTransition}
                >
                  <PageShell key={`${cacheName}-${refreshVersion}`} vnode={lastCloned.value} />
                </Transition>
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
