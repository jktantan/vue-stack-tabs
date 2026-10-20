/**
 * 页面缓存组件工厂。
 *
 * 将 keep-alive 包装、VNode 注入和页面激活生命周期从 tab 状态编排中隔离，
 * 使 useTabPanel 只负责领域状态与路由协调。
 */
import {
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

    const cacheComponent = defineComponent<{ vnode?: VNode }>({
      name: cacheName,
      props: {
        vnode: {
          type: Object as PropType<VNode>,
          required: false,
          default: undefined
        }
      },
      emits: ['onLoaded'],
      setup(props, context) {
        const localBackParams = ref<Record<string, unknown> | null>(null)
        const lastVnode = shallowRef<VNode | null | undefined>(null)
        const lastCloned = shallowRef<VNode | null>(null)
        const lastBackParams = shallowRef<Record<string, unknown> | null>(null)
        const pageRoot = ref<HTMLElement | null>(null)

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
                runtimeContext.useGlobalScroll.value ? 'overflow:auto' : 'overflow:hidden',
                'height: 100%'
              ]}
            >
              {lastCloned.value}
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
