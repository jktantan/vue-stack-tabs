// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onMounted, provide, ref, type DefineComponent } from 'vue'
import { createPageComponentFactory } from '@/lib/hooks/tabPanel/pageComponentFactory'
import { createTabPanelScroll } from '@/lib/hooks/tabPanel/scroll'
import useTabPageScroll from '@/lib/hooks/useTabPageScroll'
import useTabScrollShadow from '@/lib/hooks/useTabScrollShadow'
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
    recordMainScroller: scroll.recordMainScroller,
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

const waitFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0))
  })

/** 页面工厂的阴影类挂在 pageRoot 的父元素上；测试补一层 panel 模拟真实结构。 */
const mountPageWithPanel = (
  page: DefineComponent,
  runtimeContext: StackTabsRuntimeContext,
  vnode = h('div', { class: 'page-content' }, 'page')
) => {
  const Host = defineComponent({
    name: 'PageComponentFactoryPanelHost',
    setup() {
      provide(stackTabsContextKey, runtimeContext)
      provide(tabEmitterKey, runtimeContext.eventBus)
      return () => h('div', { class: 'test-panel' }, [h(page, { vnode })])
    }
  })
  return mount(Host)
}

const setScrollMetrics = (element: HTMLElement, scrollTop: number) => {
  Object.defineProperty(element, 'scrollTop', {
    value: scrollTop,
    writable: true,
    configurable: true
  })
  Object.defineProperty(element, 'clientHeight', { value: 100, configurable: true })
  Object.defineProperty(element, 'scrollHeight', { value: 300, configurable: true })
}

describe('pageComponentFactory pageScroll', () => {
  it('pageScroll 默认 none 时 wrapper 使用 overflow: hidden', async () => {
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

  it('pageScroll: native 时 wrapper 使用原生滚动', async () => {
    const runtimeContext = createStackTabsRuntimeContext({ pageScroll: 'native' })
    const { factory } = createHarness(runtimeContext)
    const page = factory.resolvePageComponent({ cacheName: 'page-native', tabInfo })

    const wrapper = mountPage(page, runtimeContext)
    await nextTick()

    expect(wrapper.find('.stack-tab__cache-page-wrapper').attributes('style')).toContain(
      'overflow: auto'
    )
  })

  it('传入 pageScroll 组件时在 wrapper 内渲染宿主组件并传递默认插槽', async () => {
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

    const runtimeContext = createStackTabsRuntimeContext({ pageScroll: ScrollHost })
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

    const runtimeContext = createStackTabsRuntimeContext({ pageScroll: ScrollHost })
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

    const runtimeContext = createStackTabsRuntimeContext({ pageScroll: ScrollHost })
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

  it('pageScroll: none 时页面可以通过 useTabPageScroll 注册滚动源', async () => {
    const runtimeContext = createStackTabsRuntimeContext({ pageScroll: 'none' })
    const { factory, scroll } = createHarness(runtimeContext)
    let pageScrollApi!: ReturnType<typeof useTabPageScroll>
    let shadowApi!: ReturnType<typeof useTabScrollShadow>

    const Inner = defineComponent({
      name: 'PageOwnScrollConsumer',
      setup() {
        pageScrollApi = useTabPageScroll()
        shadowApi = useTabScrollShadow()
        const scrollElement = ref<HTMLElement | null>(null)
        onMounted(() => pageScrollApi.attach(scrollElement.value))
        return () =>
          h(
            'div',
            { ref: scrollElement, class: 'inner-scroll' },
            h('div', { class: 'inner-content' }, 'content')
          )
      }
    })

    const page = factory.resolvePageComponent({ cacheName: 'page-own-scroll', tabInfo })
    const wrapper = mountPageWithPanel(page, runtimeContext, h(Inner))
    await nextTick()

    const inner = wrapper.get('.inner-scroll').element as HTMLElement
    const panel = wrapper.get('.test-panel').element as HTMLElement
    setScrollMetrics(inner, 100)
    inner.dispatchEvent(new Event('scroll'))
    await waitFrame()

    expect(shadowApi.getState()).toBe('both')
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)

    inner.scrollTop = 120
    scroll.saveScroller('page-own-scroll')
    inner.scrollTop = 0
    scroll.restoreScroller('page-own-scroll')

    expect(inner.scrollTop).toBe(120)
  })
})

describe('pageComponentFactory scroll shadow API', () => {
  it('页面内组件可读取阴影状态并手动开关阴影', async () => {
    const runtimeContext = createStackTabsRuntimeContext({
      pageScroll: 'native',
      scrollShadow: true
    })
    const { factory } = createHarness(runtimeContext)
    let shadowApi!: ReturnType<typeof useTabScrollShadow>

    const Inner = defineComponent({
      name: 'PageShadowConsumer',
      setup() {
        shadowApi = useTabScrollShadow()
        return () => h('div', { class: 'inner' })
      }
    })

    const page = factory.resolvePageComponent({ cacheName: 'page-shadow', tabInfo })
    const wrapper = mountPageWithPanel(page, runtimeContext, h(Inner))
    await nextTick()

    const pageWrapper = wrapper.get('.stack-tab__cache-page-wrapper').element as HTMLElement
    const panel = wrapper.get('.test-panel').element as HTMLElement
    setScrollMetrics(pageWrapper, 100)
    pageWrapper.dispatchEvent(new Event('scroll'))
    await waitFrame()

    expect(shadowApi.getState()).toBe('both')
    expect(shadowApi.state.value).toBe('both')
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)

    shadowApi.setEnabled(false)
    await waitFrame()
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)
    // 关闭渲染不影响状态计算，业务仍可据此绘制自己的阴影。
    expect(shadowApi.getState()).toBe('both')

    shadowApi.reset()
    await waitFrame()
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)
  })

  it('全局 scrollShadow=false 时仍计算状态，但不渲染阴影', async () => {
    const runtimeContext = createStackTabsRuntimeContext({
      pageScroll: 'native',
      scrollShadow: false
    })
    const { factory } = createHarness(runtimeContext)
    let shadowApi!: ReturnType<typeof useTabScrollShadow>

    const Inner = defineComponent({
      name: 'PageShadowConsumerDisabled',
      setup() {
        shadowApi = useTabScrollShadow()
        return () => h('div', { class: 'inner' })
      }
    })

    const page = factory.resolvePageComponent({ cacheName: 'page-shadow-off', tabInfo })
    const wrapper = mountPageWithPanel(page, runtimeContext, h(Inner))
    await nextTick()

    const pageWrapper = wrapper.get('.stack-tab__cache-page-wrapper').element as HTMLElement
    const panel = wrapper.get('.test-panel').element as HTMLElement
    setScrollMetrics(pageWrapper, 100)
    pageWrapper.dispatchEvent(new Event('scroll'))
    await waitFrame()

    expect(shadowApi.enabled.value).toBe(false)
    expect(shadowApi.getState()).toBe('both')
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)

    // 页面级开关优先于全局配置。
    shadowApi.setEnabled(true)
    await waitFrame()
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)
  })

  it('全局 scrollShadow 对象可单独关闭顶部，state 仍为 both', async () => {
    const runtimeContext = createStackTabsRuntimeContext({
      pageScroll: 'native',
      scrollShadow: { top: false }
    })
    const { factory } = createHarness(runtimeContext)
    let shadowApi!: ReturnType<typeof useTabScrollShadow>

    const Inner = defineComponent({
      name: 'PageShadowTopDisabled',
      setup() {
        shadowApi = useTabScrollShadow()
        return () => h('div', { class: 'inner' })
      }
    })

    const page = factory.resolvePageComponent({ cacheName: 'page-shadow-top-off', tabInfo })
    const wrapper = mountPageWithPanel(page, runtimeContext, h(Inner))
    await nextTick()

    const pageWrapper = wrapper.get('.stack-tab__cache-page-wrapper').element as HTMLElement
    const panel = wrapper.get('.test-panel').element as HTMLElement
    setScrollMetrics(pageWrapper, 100)
    pageWrapper.dispatchEvent(new Event('scroll'))
    await waitFrame()

    expect(shadowApi.getState()).toBe('both')
    expect(shadowApi.enabled.value).toBe(true)
    expect(shadowApi.enabledSides.value).toEqual({ top: false, bottom: true })
    expect(panel.classList.contains('stack-tab__shadow-inset-bottom')).toBe(true)
    expect(panel.classList.contains('stack-tab__shadow-inset-top')).toBe(false)
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)
  })

  it('页面级 setEnabled 对象可单独切换某一侧，reset 后回退全局配置', async () => {
    const runtimeContext = createStackTabsRuntimeContext({
      pageScroll: 'native',
      scrollShadow: true
    })
    const { factory } = createHarness(runtimeContext)
    let shadowApi!: ReturnType<typeof useTabScrollShadow>

    const Inner = defineComponent({
      name: 'PageShadowDirectionalConsumer',
      setup() {
        shadowApi = useTabScrollShadow()
        return () => h('div', { class: 'inner' })
      }
    })

    const page = factory.resolvePageComponent({ cacheName: 'page-shadow-directional', tabInfo })
    const wrapper = mountPageWithPanel(page, runtimeContext, h(Inner))
    await nextTick()

    const pageWrapper = wrapper.get('.stack-tab__cache-page-wrapper').element as HTMLElement
    const panel = wrapper.get('.test-panel').element as HTMLElement
    setScrollMetrics(pageWrapper, 100)
    pageWrapper.dispatchEvent(new Event('scroll'))
    await waitFrame()
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)

    // 只保留顶部：底部阴影关闭。
    shadowApi.setEnabled({ bottom: false })
    await waitFrame()
    expect(shadowApi.enabledSides.value).toEqual({ top: true, bottom: false })
    expect(panel.classList.contains('stack-tab__shadow-inset-top')).toBe(true)
    expect(panel.classList.contains('stack-tab__shadow-inset-bottom')).toBe(false)
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)

    // 只保留底部：顶部阴影关闭。
    shadowApi.setEnabled({ top: false })
    await waitFrame()
    expect(shadowApi.enabledSides.value).toEqual({ top: false, bottom: true })
    expect(panel.classList.contains('stack-tab__shadow-inset-bottom')).toBe(true)
    expect(panel.classList.contains('stack-tab__shadow-inset-top')).toBe(false)

    // 回退全局配置（true）后恢复上下阴影。
    shadowApi.reset()
    await waitFrame()
    expect(shadowApi.enabledSides.value).toEqual({ top: true, bottom: true })
    expect(panel.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)
  })
})
