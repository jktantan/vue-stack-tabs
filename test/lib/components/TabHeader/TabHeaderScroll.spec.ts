// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import type { Component } from 'vue'
import TabHeaderScroll from '@/lib/components/TabHeader/TabHeaderScroll.vue'
import { scrollIntoView } from '@/lib/utils/scrollUtils'

vi.mock('@/lib/utils/scrollUtils', () => ({
  scrollTo: ({ wrap, left, top }: { wrap: HTMLElement | null; left?: number; top?: number }) => {
    if (!wrap) return
    wrap.scrollLeft = left ?? 0
    wrap.scrollTop = top ?? 0
  },
  scrollIntoView: vi.fn()
}))

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()

  constructor(public callback: ResizeObserverCallback) {
    resizeCallbacks.push(callback)
  }
}

/** 记录组件创建的两个 ResizeObserver 回调：[0] 外层容器，[1] 标签列表 */
let resizeCallbacks: ResizeObserverCallback[] = []

function triggerTabListResize() {
  resizeCallbacks[1]?.([], {} as ResizeObserver)
}

const TabHeaderButtonStub = defineComponent({
  name: 'TabHeaderButton',
  props: {
    iconClass: String,
    disabled: Boolean,
    title: String,
    ariaLabel: String
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
          title: props.title,
          'aria-label': props.ariaLabel || props.title,
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
      default:
        '<ul class="stack-tab__nav"><li class="stack-tab__item stack-tab__item--active">Tab</li></ul>'
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
  resizeCallbacks = []
  vi.clearAllMocks()
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

  it('左右滚动按钮具有非空可访问名称', async () => {
    const { wrapper } = await mountScrollableHeaderScroll({
      isScrollWheel: false,
      isScrollButton: true
    })

    const buttons = wrapper.findAll('.tab-header-button-stub')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('aria-label')).toBe('VueStackTab.scrollLeft')
    expect(buttons[0].attributes('title')).toBe('VueStackTab.scrollLeft')
    expect(buttons[1].attributes('aria-label')).toBe('VueStackTab.scrollRight')
    expect(buttons[1].attributes('title')).toBe('VueStackTab.scrollRight')
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

describe('TabHeaderScroll active tab auto scroll', () => {
  it('标签列表尺寸抖动（如 hover 展开关闭按钮）不会把滚动位置拉回 active 标签', async () => {
    const { container } = await mountScrollableHeaderScroll({ isScrollWheel: false })
    const scrollIntoViewMock = vi.mocked(scrollIntoView)

    // 用户主动滚开 active 标签
    setScrollLeft(container, 300)
    // 仅宽度发生微小变化，标签数量不变
    setReadonlyNumberProperty(container, 'scrollWidth', 501)

    triggerTabListResize()
    await nextTick()

    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })

  it('标签数量变化时仍会把不可见的 active 标签滚入视口', async () => {
    const { wrapper, container } = await mountScrollableHeaderScroll({ isScrollWheel: false })
    const scrollIntoViewMock = vi.mocked(scrollIntoView)

    setScrollLeft(container, 300)

    const nav = wrapper.find('.stack-tab__nav').element
    const newItem = document.createElement('li')
    newItem.className = 'stack-tab__item'
    nav.appendChild(newItem)

    triggerTabListResize()
    await nextTick()

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1)
  })
})
