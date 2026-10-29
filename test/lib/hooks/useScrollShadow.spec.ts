// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useScrollShadow } from '@/lib/hooks/useScrollShadow'
import type { TabScrollShadowConfig } from '@/lib/hooks/tabScrollShadowContext'

const waitFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0))
  })

const setScrollMetrics = (
  element: HTMLElement,
  metrics: { scrollTop: number; clientHeight: number; scrollHeight: number }
) => {
  Object.defineProperty(element, 'scrollTop', {
    value: metrics.scrollTop,
    writable: true,
    configurable: true
  })
  Object.defineProperty(element, 'clientHeight', {
    value: metrics.clientHeight,
    configurable: true
  })
  Object.defineProperty(element, 'scrollHeight', {
    value: metrics.scrollHeight,
    configurable: true
  })
}

describe('useScrollShadow', () => {
  it('阴影类挂到 classTarget，滚动监听仍使用 target', async () => {
    const scroller = ref<HTMLElement | null>(null)
    const classTarget = ref<HTMLElement | null>(null)
    let api!: ReturnType<typeof useScrollShadow>

    const Host = defineComponent({
      name: 'ScrollShadowHost',
      setup() {
        api = useScrollShadow({ target: scroller, classTarget })
        return () =>
          h('div', { ref: classTarget }, [h('div', { ref: scroller, 'data-test': 'scroller' })])
      }
    })

    const wrapper = mount(Host)
    const scrollerEl = wrapper.get('[data-test="scroller"]').element as HTMLElement
    const classEl = wrapper.get('div').element as HTMLElement

    setScrollMetrics(scrollerEl, { scrollTop: 100, clientHeight: 100, scrollHeight: 300 })
    api.sync()
    scrollerEl.dispatchEvent(new Event('scroll'))
    await waitFrame()

    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)
    expect(scrollerEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)

    scrollerEl.scrollTop = 0
    scrollerEl.dispatchEvent(new Event('scroll'))
    await waitFrame()

    expect(classEl.classList.contains('stack-tab__shadow-inset-bottom')).toBe(true)
    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)

    api.clear()
    expect(classEl.classList.contains('stack-tab__shadow-inset-bottom')).toBe(false)
  })

  it('通过 getMetrics / onScroll 支持没有原生滚动元素的命令式组件', async () => {
    const classTarget = ref<HTMLElement | null>(null)
    const metrics = { scrollTop: 100, clientHeight: 100, scrollHeight: 300 }
    const scrollSubscription: { trigger: (() => void) | null } = { trigger: null }
    let api!: ReturnType<typeof useScrollShadow>

    const Host = defineComponent({
      name: 'ImperativeScrollShadowHost',
      setup() {
        api = useScrollShadow({
          target: () => null,
          classTarget,
          getMetrics: () => metrics,
          onScroll: (listener) => {
            scrollSubscription.trigger = listener
            return () => {
              if (scrollSubscription.trigger === listener) scrollSubscription.trigger = null
            }
          }
        })
        return () => h('div', { ref: classTarget, 'data-test': 'class-target' })
      }
    })

    const wrapper = mount(Host)
    const classEl = wrapper.get('[data-test="class-target"]').element as HTMLElement

    api.sync(true)
    scrollSubscription.trigger?.()
    await waitFrame()

    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)

    metrics.scrollTop = 250
    scrollSubscription.trigger?.()
    await waitFrame()

    expect(classEl.classList.contains('stack-tab__shadow-inset-top')).toBe(true)
    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)

    wrapper.unmount()
  })

  it('enabled 关闭时不写阴影类，但仍然输出 state', async () => {
    const scroller = ref<HTMLElement | null>(null)
    const classTarget = ref<HTMLElement | null>(null)
    const enabled = ref(false)
    let api!: ReturnType<typeof useScrollShadow>

    const Host = defineComponent({
      name: 'ToggleableScrollShadowHost',
      setup() {
        api = useScrollShadow({ target: scroller, classTarget, enabled })
        return () =>
          h('div', { ref: classTarget }, [h('div', { ref: scroller, 'data-test': 'scroller' })])
      }
    })

    const wrapper = mount(Host)
    const scrollerEl = wrapper.get('[data-test="scroller"]').element as HTMLElement
    const classEl = wrapper.get('div').element as HTMLElement

    setScrollMetrics(scrollerEl, { scrollTop: 100, clientHeight: 100, scrollHeight: 300 })
    api.sync()
    scrollerEl.dispatchEvent(new Event('scroll'))
    await waitFrame()

    expect(api.state.value).toBe('both')
    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)

    enabled.value = true
    api.sync()
    await waitFrame()

    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(true)
  })

  it('enabled 对象可单独关闭某一侧，state 仍按真实方向计算', async () => {
    const scroller = ref<HTMLElement | null>(null)
    const classTarget = ref<HTMLElement | null>(null)
    const enabled = ref<TabScrollShadowConfig>({ top: false })
    let api!: ReturnType<typeof useScrollShadow>

    const Host = defineComponent({
      name: 'DirectionalScrollShadowHost',
      setup() {
        api = useScrollShadow({ target: scroller, classTarget, enabled })
        return () =>
          h('div', { ref: classTarget }, [h('div', { ref: scroller, 'data-test': 'scroller' })])
      }
    })

    const wrapper = mount(Host)
    const scrollerEl = wrapper.get('[data-test="scroller"]').element as HTMLElement
    const classEl = wrapper.get('div').element as HTMLElement

    // 上下都有内容，但顶部被单独关闭 -> 只显示底部阴影。
    setScrollMetrics(scrollerEl, { scrollTop: 100, clientHeight: 100, scrollHeight: 300 })
    api.sync()
    await waitFrame()

    expect(api.state.value).toBe('both')
    expect(classEl.classList.contains('stack-tab__shadow-inset-bottom')).toBe(true)
    expect(classEl.classList.contains('stack-tab__shadow-inset-top')).toBe(false)
    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)

    // 改为关闭底部 -> 只显示顶部阴影。
    enabled.value = { bottom: false }
    api.sync()
    await waitFrame()

    expect(api.state.value).toBe('both')
    expect(classEl.classList.contains('stack-tab__shadow-inset-top')).toBe(true)
    expect(classEl.classList.contains('stack-tab__shadow-inset-bottom')).toBe(false)
    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)

    // 两侧都关闭 -> 不渲染阴影，state 不变。
    enabled.value = false
    api.sync()
    await waitFrame()

    expect(api.state.value).toBe('both')
    expect(classEl.classList.contains('stack-tab__shadow-inset-top')).toBe(false)
    expect(classEl.classList.contains('stack-tab__shadow-inset-bottom')).toBe(false)
    expect(classEl.classList.contains('stack-tab__shadow-inset-vertical')).toBe(false)
  })
})
