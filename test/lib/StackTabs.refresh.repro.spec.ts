// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onUnmounted } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import StackTabs from '@/lib/StackTabs.vue'
import useTabRouter from '@/lib/hooks/useTabRouter'
import { encodeTabInfo } from '@/lib/utils/tabInfoEncoder'

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({ t: (key: string) => key, changeLocale: vi.fn() })
}))
vi.mock('@/lib/i18n/stackTabsLocale', () => ({ applyStackTabsLocale: vi.fn() }))

const TabOne = defineComponent({
  name: 'RefreshReproOne',
  setup() {
    return () => h('input', { 'data-test': 'tab-one-input' })
  }
})
const TabTwo = defineComponent({
  name: 'RefreshReproTwo',
  setup() {
    return () => h('p', 'two')
  }
})

/** 多根节点页面：模拟 demo 的 test2.vue（多个按钮 + 内容 div）。 */
const FragmentPage = defineComponent({
  name: 'RefreshFragmentPage',
  setup() {
    return () => [
      h('button', { 'data-test': 'fragment-button' }, 'button'),
      h('p', { 'data-test': 'fragment-content' }, 'fragment')
    ]
  }
})

const ForwardHome = defineComponent({
  name: 'RefreshForwardHome',
  setup() {
    const { forward } = useTabRouter()
    return () =>
      h(
        'button',
        {
          'data-test': 'forward-button',
          onClick: () => void forward({ path: '/fragment' })
        },
        'forward'
      )
  }
})

let countingCreated = 0
let countingUnmounted = 0
const CountingPage = defineComponent({
  name: 'RefreshCountingPage',
  setup() {
    countingCreated++
    onUnmounted(() => {
      countingUnmounted++
    })
    return () => h('p', 'counting')
  }
})

afterEach(() => {
  window.sessionStorage.clear()
})
enableAutoUnmount(afterEach)

describe('StackTabs refresh cache reproduction', () => {
  it('keeps state when switching tabs without a refresh', async () => {
    const tabOne = { id: 'one', title: 'One', path: '/one' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/one', component: TabOne },
        { path: '/two', component: TabTwo }
      ]
    })
    await router.push({ path: '/one', query: { __tab: encodeTabInfo(tabOne) } })
    await router.isReady()
    const wrapper = mount(StackTabs, {
      props: {
        iframePath: '/iframe',
        defaultTabs: [tabOne, { id: 'two', title: 'Two', path: '/two' }],
        pageTransition: '',
        pageTransitionBack: ''
      },
      global: { plugins: [router] }
    })
    await nextTick()
    await nextTick()
    await wrapper.get<HTMLInputElement>('[data-test="tab-one-input"]').setValue('normal')
    await wrapper.get('[role="tab"][data-tab-id="two"]').trigger('click')
    await flushPromises()
    await wrapper.get('[role="tab"][data-tab-id="one"]').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('[data-test="tab-one-input"]').element.value).toBe(
      'normal'
    )
  })

  it('keeps state after the first tab switch following a refresh', async () => {
    const tabOne = { id: 'one', title: 'One', path: '/one' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/one', component: TabOne },
        { path: '/two', component: TabTwo }
      ]
    })
    await router.push({ path: '/one', query: { __tab: encodeTabInfo(tabOne) } })
    await router.isReady()

    const wrapper = mount(StackTabs, {
      props: {
        iframePath: '/iframe',
        defaultTabs: [tabOne, { id: 'two', title: 'Two', path: '/two' }],
        pageTransition: '',
        pageTransitionBack: ''
      },
      global: { plugins: [router] }
    })
    await nextTick()
    await nextTick()

    await wrapper.get('[role="tab"][data-tab-id="one"]').trigger('contextmenu')
    await nextTick()
    await wrapper.get('[role="menuitem"]').trigger('click')
    await nextTick()

    const input = wrapper.get<HTMLInputElement>('[data-test="tab-one-input"]')
    await input.setValue('first')
    await wrapper.get('[role="tab"][data-tab-id="two"]').trigger('click')
    await flushPromises()
    await nextTick()
    await wrapper.get('[role="tab"][data-tab-id="one"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.get<HTMLInputElement>('[data-test="tab-one-input"]').element.value).toBe('first')
  })

  it('刷新时在缓存 wrapper 上执行离场/入场动画，结束后清理干净', async () => {
    const transitionName = 'stack-tab-swap'
    const realGetComputedStyle = window.getComputedStyle.bind(window)
    const styleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(((
      element: Element,
      pseudo?: string | null
    ) => {
      const style = realGetComputedStyle(element, pseudo ?? undefined)
      if (
        element instanceof HTMLElement &&
        element.classList.contains('stack-tab__cache-page-wrapper')
      ) {
        return new Proxy(style, {
          get(target, property, receiver) {
            if (property === 'transitionDuration') return '0.3s, 0.3s'
            if (property === 'transitionDelay') return '0s'
            return Reflect.get(target, property, receiver)
          }
        }) as CSSStyleDeclaration
      }
      return style
    }) as typeof window.getComputedStyle)

    try {
      const tab = { id: 'animated', title: 'Animated', path: '/animated' }
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/animated', component: TabOne }]
      })
      await router.push({ path: '/animated', query: { __tab: encodeTabInfo(tab) } })
      await router.isReady()

      const wrapper = mount(StackTabs, {
        props: {
          iframePath: '/iframe',
          defaultTabs: [tab],
          pageTransition: transitionName,
          pageTransitionBack: `${transitionName}-back`,
          pageScroll: 'native'
        },
        global: { plugins: [router] }
      })
      await nextTick()
      await nextTick()

      const pageWrapper = wrapper.get('.stack-tab__cache-page-wrapper')
      // 阴影类挂在滚动容器的父元素（生产环境是 keep-alive panel；测试环境可能被 Transition stub 包裹）
      const shadowTarget = pageWrapper.element.parentElement as HTMLElement
      const pageElement = pageWrapper.element as HTMLElement
      Object.defineProperty(pageElement, 'scrollTop', {
        value: 100,
        writable: true,
        configurable: true
      })
      Object.defineProperty(pageElement, 'clientHeight', { value: 100, configurable: true })
      Object.defineProperty(pageElement, 'scrollHeight', { value: 300, configurable: true })

      const waitFor = async (predicate: () => boolean) => {
        const start = Date.now()
        while (!predicate() && Date.now() - start < 1500) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }

      pageElement.dispatchEvent(new Event('scroll'))
      await waitFor(() => shadowTarget.classList.contains('stack-tab__shadow-inset-vertical'))
      expect(shadowTarget.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)
      expect(pageWrapper.classes().some((name) => name.includes('shadow-inset'))).toBe(false)

      await wrapper.get('[role="tab"][data-tab-id="animated"]').trigger('contextmenu')
      await nextTick()
      await wrapper.get('[role="menuitem"]').trigger('click')

      await waitFor(() => pageWrapper.classes().includes(`${transitionName}-leave-to`))
      expect(pageWrapper.classes()).toContain(`${transitionName}-leave-active`)
      expect(pageWrapper.classes()).toContain(`${transitionName}-leave-to`)
      // 动画作用于 wrapper 本身，不应在动画期间隐藏 overflow（否则滚动条/内容宽度会跳）。
      expect((pageWrapper.element as HTMLElement).style.overflow).toBe('auto')
      // 阴影类挂在 panel（不参与 transform）上，刷新动画期间保持稳定。
      expect(shadowTarget.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)
      expect(pageWrapper.classes().some((name) => name.includes('shadow-inset'))).toBe(false)

      pageWrapper.element.dispatchEvent(new Event('transitionend'))
      await waitFor(() => pageWrapper.classes().includes(`${transitionName}-enter-active`))
      expect(pageWrapper.classes()).toContain(`${transitionName}-enter-active`)
      expect(wrapper.find('[data-test="tab-one-input"]').exists()).toBe(true)

      pageWrapper.element.dispatchEvent(new Event('transitionend'))
      await waitFor(() => !pageWrapper.classes().some((name) => name.includes(transitionName)))
      expect(pageWrapper.classes().some((name) => name.includes(transitionName))).toBe(false)
      expect(shadowTarget.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)
      expect(wrapper.find('[data-test="tab-one-input"]').exists()).toBe(true)
    } finally {
      styleSpy.mockRestore()
    }
  })

  it('refreshing the active tab does not accumulate keep-alive page instances', async () => {
    countingCreated = 0
    countingUnmounted = 0
    const countTab = { id: 'count', title: 'Count', path: '/count' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/count', component: CountingPage }]
    })
    await router.push({ path: '/count', query: { __tab: encodeTabInfo(countTab) } })
    await router.isReady()

    const wrapper = mount(StackTabs, {
      props: {
        iframePath: '/iframe',
        defaultTabs: [countTab],
        pageTransition: '',
        pageTransitionBack: ''
      },
      global: { plugins: [router] }
    })
    await nextTick()
    await nextTick()

    for (let index = 0; index < 3; index++) {
      await wrapper.get('[role="tab"][data-tab-id="count"]').trigger('contextmenu')
      await nextTick()
      await wrapper.get('[role="menuitem"]').trigger('click')
      await nextTick()
    }

    expect(countingCreated).toBe(4)
    // 旧实例必须被卸载；修复前这里是 0，实例会随刷新持续累积。
    expect(countingUnmounted).toBe(3)
  })

  it('keeps tab one state when refreshing tab two', async () => {
    const tabOne = { id: 'one', title: 'One', path: '/one' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/one', component: TabOne },
        { path: '/two', component: TabTwo }
      ]
    })
    await router.push({ path: '/one', query: { __tab: encodeTabInfo(tabOne) } })
    await router.isReady()

    const wrapper = mount(StackTabs, {
      props: {
        iframePath: '/iframe',
        defaultTabs: [tabOne, { id: 'two', title: 'Two', path: '/two' }],
        pageTransition: '',
        pageTransitionBack: ''
      },
      global: { plugins: [router] }
    })
    await nextTick()
    await nextTick()

    await wrapper.get<HTMLInputElement>('[data-test="tab-one-input"]').setValue('tab-one-state')
    await wrapper.get('[role="tab"][data-tab-id="two"]').trigger('click')
    await flushPromises()
    await wrapper.get('[role="tab"][data-tab-id="two"]').trigger('contextmenu')
    await nextTick()
    await wrapper.get('[role="menuitem"]').trigger('click')
    await nextTick()
    await wrapper.get('[role="tab"][data-tab-id="one"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.get<HTMLInputElement>('[data-test="tab-one-input"]').element.value).toBe(
      'tab-one-state'
    )
  })

  it('刷新前进后的多根节点页面不会空白（Transition 需要真实元素根节点）', async () => {
    const homeTab = { id: 'fragment-home', title: 'Fragment Home', path: '/fragment-home' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/fragment-home', component: ForwardHome },
        { path: '/fragment', component: FragmentPage },
        { path: '/iframe', component: FragmentPage }
      ]
    })
    await router.push({ path: '/fragment-home' })
    await router.isReady()

    const wrapper = mount(StackTabs, {
      props: {
        iframePath: '/iframe',
        homeTab,
        pageTransition: 'stack-tab-swap',
        pageTransitionBack: 'stack-tab-swap-back'
      },
      global: { plugins: [router] }
    })
    await nextTick()
    await nextTick()

    await wrapper.get('[data-test="forward-button"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-test="fragment-content"]').exists()).toBe(true)

    await wrapper.get('[role="tab"][data-tab-id="fragment-home"]').trigger('contextmenu')
    await nextTick()
    await wrapper.get('[role="menuitem"]').trigger('click')
    await nextTick()

    // 修复前：真实浏览器里离场动画等不到结束，新页面不挂载（空白）。
    expect(wrapper.find('[data-test="fragment-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="fragment-content"]').exists()).toBe(true)
    // 多根节点页面不额外套元素，原有的多个根仍直接位于缓存 wrapper 下。
    expect(wrapper.find('.stack-tab__page-shell').exists()).toBe(false)
    expect(wrapper.get('.stack-tab__cache-page-wrapper').element.children.length).toBe(2)
  })
})
