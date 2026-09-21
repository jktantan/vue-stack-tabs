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
import type { DefineComponent, VNode } from 'vue'
import type { ITabBase, ITabItem } from '../../model/TabModel'
import PageLoading from '../../components/PageLoading.vue'
import type { StackTabsRuntimeContext } from '../stackTabsContext'

const EmptyPlaceholderComponent = defineComponent({
  name: 'StackTabEmptyPlaceholder',
  setup() {
    return () => null
  }
}) as DefineComponent

export const getEmptyPlaceholderComponent = () => EmptyPlaceholderComponent

interface PageComponentFactoryOptions {
  runtimeContext: StackTabsRuntimeContext
  getTab: (id: string) => ITabItem | null
  addCache: (cacheName: string) => void
  evictMarkedCaches: () => void
  addPageScroller: (pageId: string, ...selectors: string[]) => void
  saveScroller: (pageId: string) => void
  restoreScroller: (pageId: string) => void
  removeScroller: (pageId: string) => void
}

export const createPageComponentFactory = (options: PageComponentFactoryOptions) => {
  const {
    runtimeContext,
    getTab,
    addCache,
    evictMarkedCaches,
    addPageScroller,
    saveScroller,
    restoreScroller,
    removeScroller
  } = options
  const { components, tabIdsToEvict } = runtimeContext

  const resolvePageComponent = (ctx: { cacheName: string; tabInfo: ITabBase }): DefineComponent => {
    const { cacheName, tabInfo } = ctx
    const existing = components.get(cacheName)
    if (existing) {
      addCache(cacheName)
      return existing
    }

    const cacheComponent = defineComponent({
      name: cacheName,
      props: {
        vnode: {
          type: Object as () => VNode,
          required: false,
          default: undefined
        }
      },
      emits: ['onLoaded'],
      setup(props, context) {
        const localBackParams = ref<Record<string, unknown> | null>(null)
        const lastVnode = shallowRef<VNode | null>(null)
        const lastCloned = shallowRef<VNode | null>(null)
        const lastBackParams = shallowRef<Record<string, unknown> | null>(null)

        const checkAndConsumeBackParams = () => {
          try {
            const tab = getTab(tabInfo.id!)
            const top = tab?.pages.peek()
            if (top && top.id === cacheName && top._backParams) {
              localBackParams.value = { ...top._backParams }
              delete top._backParams
            } else {
              localBackParams.value = null
            }
          } catch {
            localBackParams.value = null
          }
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
          tabIdsToEvict.clear()
          checkAndConsumeBackParams()
        })
        onUnmounted(() => removeScroller(cacheName))

        return () => {
          const vnode = props.vnode as VNode | undefined
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
              class="cache-page-wrapper"
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
    components.set(cacheName, cacheComponent)
    addCache(cacheName)
    return cacheComponent
  }

  return { resolvePageComponent }
}
