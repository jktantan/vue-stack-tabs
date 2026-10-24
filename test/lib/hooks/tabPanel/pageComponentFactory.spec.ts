// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, provide, ref, type DefineComponent } from 'vue'
import { createPageComponentFactory } from '@/lib/hooks/tabPanel/pageComponentFactory'
import { createTabPanelScroll } from '@/lib/hooks/tabPanel/scroll'
import {
  createStackTabsRuntimeContext,
  stackTabsContextKey,
  type StackTabsRuntimeContext
} from '@/lib/hooks/stackTabsContext'
import { TabEventType, tabEmitterKey } from '@/lib/hooks/useTabEventBus'
import type { ITabBase } from '@/lib/model/TabModel'

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/lib/utils/scrollUtils', () => ({
  getMaxZIndex: () => 10,
  invalidateZIndexCache: () => undefined
}))

const tabInfo: ITabBase = {
  id: 'tab-1',
  title: 'Tab 1',
  closable: true,
  refreshable: true,
  iframe: false
}

const createHarness = (runtimeContext: StackTabsRuntimeContext) => {
  const scroll = createTabPanelScroll(runtimeContext)
  const factory = createPageComponentFactory({
    runtimeContext,
    consumeBackParams: () => null,
    getComponent: () => undefined,
    setComponent: () => undefined,
    addCache: () => undefined,
    evictMarkedCaches: () => undefined,
    clearTabEvictionMarks: () => undefined,
    addPageScroller: scroll.addPageScroller,
    setPageScrollAdapter: scroll.setPageScrollAdapter,
    saveScroller: scroll.saveScroller,
    restoreScroller: scroll.restoreScroller,
    removeScroller: scroll.removeScroller
  })
  return { scroll, factory }
}

const mountPage = (
  page: DefineComponent,
  runtimeContext: StackTabsRuntimeContext,
  vnode = h('div', { class: 'page-content' }, 'page')
) => {
  const Host = defineComponent({
    name: 'PageComponentFactoryHost',
    setup() {
      provide(stackTabsContextKey, runtimeContext)
      provide(tabEmitterKey, runtimeContext.eventBus)
      return () => h(page, { vnode })
    }
  })
  return mount(Host)
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('pageComponentFactory scrollContainer', () => {
  it('不传 scrollContainer 时保持默认 wrapper 结构与 #W id', async () => {
    const runtimeContext = createStackTabsRuntimeContext()
    const { factory } = createHarness(runtimeContext)
    const page = factory.resolvePageComponent({ cacheName: 'page-default', tabInfo })

    const wrapper = mountPage(page, runtimeContext)
    await nextTick()

    const pageWrapper = wrapper.find('.stack-tab__cache-page-wrapper')
    expect(pageWrapper.exists()).toBe(true)
    expect(pageWrapper.attributes('id')).toBe('W-page-default')
    expect(pageWrapper.attributes('style')).toContain('overflow: hidden')
    expect(pageWrapper.find('.page-content').exists()).toBe(true)
  })

  it('传入 scrollContainer 时在 wrapper 内渲染宿主组件并传递默认插槽', async () => {
    const ScrollHost = defineComponent({
      name: 'TestScrollHost',
      setup(_, { slots, expose }) {
        const scrollElement = ref<HTMLElement | null>(null)
        expose({ scrollElement })
        return () =>
          h('div', { class: 'scroll-host' }, [
            h('div', { ref: scrollElement, class: 'scroll-element' }, slots.default?.())
          ])
      }
    })

    const runtimeContext = createStackTabsRuntimeContext({ scrollContainer: ScrollHost })
    const { factory } = createHarness(runtimeContext)
    const page = factory.resolvePageComponent({ cacheName: 'page-custom', tabInfo })

    const wrapper = mountPage(page, runtimeContext)
    await nextTick()

    const pageWrapper = wrapper.find('.stack-tab__cache-page-wrapper')
    expect(pageWrapper.attributes('style')).toContain('overflow: hidden')
    expect(pageWrapper.find('.scroll-host').exists()).toBe(true)
    expect(pageWrapper.find('.scroll-host .page-content').exists()).toBe(true)

    // PageLoading 由外层 wrapper 承载，不进入滚动容器。
    runtimeContext.eventBus.emit(TabEventType.PAGE_LOADING, { tId: 'tab-1', value: true })
    await nextTick()
    expect(wrapper.find('.stack-tab__cache-page-wrapper > .stack-tab-loading__mask').exists()).toBe(
      true
    )
    expect(wrapper.find('.scroll-host .stack-tab-loading__mask').exists()).toBe(false)
  })

  it('自定义滚动组件的 scrollElement 参与位置保存与恢复', async () => {
    const ScrollHost = defineComponent({
      name: 'TestScrollHostWithElement',
      setup(_, { slots, expose }) {
        const scrollElement = ref<HTMLElement | null>(null)
        expose({ scrollElement })
        return () =>
          h('div', { class: 'scroll-host' }, [
            h('div', { ref: scrollElement, class: 'scroll-element' }, slots.default?.())
          ])
      }
    })

    const runtimeContext = createStackTabsRuntimeContext({ scrollContainer: ScrollHost })
    const { factory, scroll } = createHarness(runtimeContext)
    const page = factory.resolvePageComponent({ cacheName: 'page-scroll', tabInfo })

    const wrapper = mountPage(page, runtimeContext)
    await nextTick()

    const scrollElement = wrapper.get('.scroll-element').element as HTMLElement
    scrollElement.scrollTop = 120
    scrollElement.scrollLeft = 12
    scroll.saveScroller('page-scroll')

    scrollElement.scrollTop = 0
    scrollElement.scrollLeft = 0
    scroll.restoreScroller('page-scroll')

    expect(scrollElement.scrollTop).toBe(120)
    expect(scrollElement.scrollLeft).toBe(12)
  })

  it('命令式滚动组件的 getPosition / setPosition 参与位置保存与恢复', async () => {
    let position = { top: 0, left: 0 }
    const ScrollHost = defineComponent({
      name: 'TestImperativeScrollHost',
      setup(_, { slots, expose }) {
        expose({
          getPosition: () => position,
          setPosition: (next: { top: number; left: number }) => {
            position = { ...next }
          },
          onScroll: () => () => undefined
        })
        return () => h('div', { class: 'scroll-host' }, slots.default?.())
      }
    })

    const runtimeContext = createStackTabsRuntimeContext({ scrollContainer: ScrollHost })
    const { factory, scroll } = createHarness(runtimeContext)
    const page = factory.resolvePageComponent({ cacheName: 'page-imperative', tabInfo })

    mountPage(page, runtimeContext)
    await nextTick()

    position = { top: 42, left: 4 }
    scroll.saveScroller('page-imperative')
    position = { top: 0, left: 0 }
    scroll.restoreScroller('page-imperative')

    expect(position).toEqual({ top: 42, left: 4 })
  })
})
