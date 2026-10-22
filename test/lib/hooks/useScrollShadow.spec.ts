// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useScrollShadow } from '@/lib/hooks/useScrollShadow'

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
})
