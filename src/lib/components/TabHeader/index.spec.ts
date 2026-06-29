// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import mitt from 'mitt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Component } from 'vue'
import type { IContextMenu, ITabItem } from '../../model/TabModel'
import TabHeader from './index.vue'

const activeTabMock = vi.fn()
const closeTabMock = vi.fn()
const tabs = ref<ITabItem[]>([])

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('../../hooks/useTabActions', () => ({
  default: () => ({
    activeTab: activeTabMock,
    closeTab: closeTabMock,
    tabs
  })
}))

const TabHeaderScrollStub = defineComponent({
  name: 'TabHeaderScroll',
  props: {
    space: Number,
    isScrollWheel: Boolean,
    isScrollButton: Boolean
  },
  setup(_, { slots, expose }) {
    expose({
      isInView: () => true,
      scrollIntoView: vi.fn()
    })

    return () => h('div', { class: 'tab-header-scroll-stub' }, slots.default?.())
  }
})

const TabHeaderItemStub = defineComponent({
  name: 'TabHeaderItem',
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  emits: ['contextmenu', 'active', 'close'],
  setup(props, { emit }) {
    return () =>
      h(
        'li',
        {
          class: 'stack-tab__item',
          onClick: () => emit('active', props.item, undefined, true),
          onContextmenu: (event: MouseEvent) => emit('contextmenu', event)
        },
        String((props.item as ITabItem).title)
      )
  }
})

const ContextMenuStub = defineComponent({
  name: 'ContextMenu',
  props: {
    left: Number,
    top: Number,
    tabItem: Object,
    max: Number,
    index: Number,
    contextMenu: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close'],
  setup(props) {
    return () =>
      h('div', { class: 'stack-tab__contextmenu', 'data-test': 'context-menu' }, [
        h(
          'span',
          { 'data-test': 'custom-menu-count' },
          String((props.contextMenu as unknown[]).length)
        ),
        ...(props.contextMenu as IContextMenu[]).map((item) =>
          h(
            'button',
            {
              type: 'button',
              'data-test': `custom-menu-${item.title}`,
              onClick: () => item.callback((props.tabItem as ITabItem).id)
            },
            item.title
          )
        )
      ])
  }
})

function makeTab(overrides: Partial<ITabItem> = {}): ITabItem {
  return {
    id: 'tab-1',
    title: 'Dashboard',
    closable: true,
    refreshable: true,
    iframe: false,
    active: true,
    pages: { list: () => [] } as unknown as ITabItem['pages'],
    ...overrides
  }
}

function mountHeader(props: Record<string, unknown> = {}) {
  return mount(TabHeader, {
    props: {
      space: 300,
      ...props
    },
    global: {
      provide: {
        maximum: ref(false),
        tabEmitter: mitt()
      },
      stubs: {
        TabHeaderScroll: TabHeaderScrollStub as Component,
        TabHeaderItem: TabHeaderItemStub as Component,
        ContextMenu: ContextMenuStub as Component,
        TabHeaderButton: true,
        Transition: false,
        TransitionGroup: false
      }
    }
  })
}

async function triggerTabContextMenu(wrapper: ReturnType<typeof mountHeader>) {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 120,
    clientY: 80
  })

  wrapper.find('.stack-tab__item').element.dispatchEvent(event)
  await nextTick()
  await nextTick()

  return event
}

beforeEach(() => {
  activeTabMock.mockReset()
  closeTabMock.mockReset()
  activeTabMock.mockResolvedValue(undefined)
  tabs.value = [makeTab()]
})

describe('TabHeader active', () => {
  it('activeTab 成功后才 emit active', async () => {
    const wrapper = mountHeader()

    await wrapper.find('.stack-tab__item').trigger('click')
    await nextTick()

    expect(activeTabMock).toHaveBeenCalledWith('tab-1', true)
    expect(wrapper.emitted('active')).toEqual([['tab-1']])
  })

  it('activeTab 失败时捕获错误且不 emit active', async () => {
    activeTabMock.mockRejectedValue(new Error('navigation aborted'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mountHeader()

    await wrapper.find('.stack-tab__item').trigger('click')
    await nextTick()
    await nextTick()

    expect(activeTabMock).toHaveBeenCalledWith('tab-1', true)
    expect(wrapper.emitted('active')).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(
      '[vue-stack-tabs] Failed to activate tab:',
      expect.any(Error)
    )

    warnSpy.mockRestore()
  })
})

describe('TabHeader contextmenu', () => {
  it('默认启用右键菜单', async () => {
    const wrapper = mountHeader()

    const event = await triggerTabContextMenu(wrapper)

    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.find('[data-test="context-menu"]').exists()).toBe(true)
  })

  it('contextmenu=false 时不打开自定义右键菜单，且左键激活仍工作', async () => {
    const wrapper = mountHeader({ contextmenu: false })

    const event = await triggerTabContextMenu(wrapper)

    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.find('[data-test="context-menu"]').exists()).toBe(false)

    await wrapper.find('.stack-tab__item').trigger('click')

    expect(activeTabMock).toHaveBeenCalledWith('tab-1', true)
  })

  it('传入 IContextMenu[] 时把自定义菜单透传给 ContextMenu', async () => {
    const customMenuCallback = vi.fn()
    const contextmenu: IContextMenu[] = [
      {
        title: 'Pin tab',
        callback: customMenuCallback,
        disabled: () => false
      }
    ]
    const wrapper = mountHeader({ contextmenu })

    await triggerTabContextMenu(wrapper)
    await wrapper.find('[data-test="custom-menu-Pin tab"]').trigger('click')

    expect(wrapper.find('[data-test="custom-menu-count"]').text()).toBe('1')
    expect(customMenuCallback).toHaveBeenCalledWith('tab-1')
  })
})
