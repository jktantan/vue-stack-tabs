// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import type { Component } from 'vue'
import TabHeaderScroll from '@/lib/components/TabHeader/TabHeaderScroll.vue'

vi.mock('@/lib/utils/scrollUtils', () => ({
  scrollTo: ({ wrap, left, top }: { wrap: HTMLElement | null; left?: number; top?: number }) => {
    if (!wrap) return
    wrap.scrollLeft = left ?? 0
    wrap.scrollTop = top ?? 0
  },
  scrollIntoView: vi.fn()
}))

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()

  constructor() {}
}

const TabHeaderButtonStub = defineComponent({
  name: 'TabHeaderButton',
  props: {
    iconClass: String,
    disabled: Boolean
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          class: ['tab-header-button-stub', props.iconClass],
          disabled: props.disabled,
          onClick: () => emit('click')
        },
        props.iconClass
      )
  }
})

function setReadonlyNumberProperty(
  element: Element,
  key: 'clientWidth' | 'scrollWidth',
  value: number
) {
  Object.defineProperty(element, key, {
    configurable: true,
    value
  })
}

function setScrollLeft(element: Element, value: number) {
  Object.defineProperty(element, 'scrollLeft', {
    configurable: true,
    writable: true,
    value
  })
}

async function mountScrollableHeaderScroll(props: Record<string, unknown>) {
  const wrapper = mount(TabHeaderScroll, {
    props: {
      space: 50,
      ...props
    },
    slots: {
      default: '<ul class="stack-tab__nav"><li class="stack-tab__item is-active">Tab</li></ul>'
    },
    global: {
      stubs: {
        TabHeaderButton: TabHeaderButtonStub as Component
      }
    }
  })

  const container = wrapper.find('.stack-tab__scroll-container').element
  setReadonlyNumberProperty(container, 'clientWidth', 100)
  setReadonlyNumberProperty(container, 'scrollWidth', 500)
  setScrollLeft(container, 0)

  await wrapper.find('.stack-tab__scroll-container').trigger('scroll')
  await nextTick()

  return { wrapper, container: container as HTMLElement }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

describe('TabHeaderScroll scroll mode gates', () => {
  it('WHEEL 模式：滚轮可滚动，左右按钮不显示', async () => {
    const { wrapper, container } = await mountScrollableHeaderScroll({
      isScrollWheel: true,
      isScrollButton: false
    })

    await wrapper.find('.stack-tab__scroll').trigger('wheel', { deltaY: 100 })

    expect(container.scrollLeft).toBe(50)
    expect(wrapper.findAll('.tab-header-button-stub')).toHaveLength(0)
  })

  it('BUTTON 模式：左右按钮显示，滚轮不改变滚动位置', async () => {
    const { wrapper, container } = await mountScrollableHeaderScroll({
      isScrollWheel: false,
      isScrollButton: true
    })

    await wrapper.find('.stack-tab__scroll').trigger('wheel', { deltaY: 100 })

    expect(container.scrollLeft).toBe(0)
    expect(wrapper.findAll('.tab-header-button-stub')).toHaveLength(2)
  })

  it('BOTH 模式：左右按钮显示，滚轮也可滚动', async () => {
    const { wrapper, container } = await mountScrollableHeaderScroll({
      isScrollWheel: true,
      isScrollButton: true
    })

    await wrapper.find('.stack-tab__scroll').trigger('wheel', { deltaY: 100 })

    expect(container.scrollLeft).toBe(50)
    expect(wrapper.findAll('.tab-header-button-stub')).toHaveLength(2)
  })
})
