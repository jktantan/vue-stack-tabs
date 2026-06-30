// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Component, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import StackKeepAlive from '@/lib/components/StackKeepAlive/StackKeepAlive.vue'

const caches = ref<string[]>([])
const refreshKey = ref(0)
const activeCacheKey = ref('')
const addPageMock = vi.fn()

enableAutoUnmount(afterEach)

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    caches,
    refreshKey,
    activeCacheKey,
    addPage: addPageMock
  })
}))

interface RouterViewSlotProps {
  Component: VNode
  route: RouteLocationNormalizedLoaded
}

function makeRoute(path = '/dashboard'): RouteLocationNormalizedLoaded {
  return {
    path,
    matched: [{ path }] as RouteLocationNormalizedLoaded['matched'],
    query: {},
    params: {},
    hash: '',
    fullPath: path,
    name: undefined,
    meta: {},
    redirectedFrom: undefined
  }
}

const PageComponent = defineComponent({
  name: 'PageComponent',
  setup() {
    return () => h('section', { 'data-test': 'page-component' }, 'page')
  }
})

let wrappedInstanceId = 0

const WrappedPage = defineComponent({
  name: 'wrapped-cache-page',
  props: {
    vnode: {
      type: Object,
      required: false,
      default: undefined
    }
  },
  emits: ['onLoaded'],
  setup(props, { emit }) {
    const instanceId = ++wrappedInstanceId

    return () =>
      h(
        'article',
        {
          'data-test': 'wrapped-page',
          'data-instance-id': String(instanceId),
          'data-has-vnode': props.vnode ? 'true' : 'false',
          onClick: () => emit('onLoaded')
        },
        'wrapped'
      )
  }
})

const TransitionStub = defineComponent({
  name: 'Transition',
  props: {
    name: String,
    appear: Boolean,
    mode: String
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          'data-test': 'transition-stub',
          'data-transition-name': props.name,
          'data-transition-appear': String(props.appear),
          'data-transition-mode': props.mode
        },
        slots.default?.()
      )
  }
})

const RouterViewStub = defineComponent({
  name: 'RouterView',
  setup(_, { slots }) {
    const slotProps: RouterViewSlotProps = {
      Component: h(PageComponent),
      route: makeRoute()
    }

    return () => h('div', { 'data-test': 'router-view-stub' }, slots.default?.(slotProps))
  }
})

function mountKeepAlive(transitionName = 'stack-tab-swap') {
  return mount(StackKeepAlive, {
    props: {
      transitionName
    },
    global: {
      stubs: {
        RouterView: RouterViewStub,
        transition: TransitionStub,
        KeepAlive: false
      }
    }
  })
}

beforeEach(() => {
  caches.value = ['cache-a']
  refreshKey.value = 7
  activeCacheKey.value = 'cache-a'
  addPageMock.mockReset()
  wrappedInstanceId = 0
  addPageMock.mockReturnValue(WrappedPage as Component)
})

describe('StackKeepAlive', () => {
  it('通过 router-view slot 调用 addPage 并渲染包装后的缓存页面', () => {
    const wrapper = mountKeepAlive()

    expect(addPageMock).toHaveBeenCalledTimes(1)
    expect(addPageMock.mock.calls[0]?.[0]).toMatchObject({ path: '/dashboard' })
    expect(addPageMock.mock.calls[0]?.[1]).toBeTruthy()
    expect(wrapper.find('[data-test="wrapped-page"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wrapped-page"]').attributes('data-has-vnode')).toBe('true')
  })

  it('activeCacheKey 变化时重建缓存页实例但不重复调用 addPage', async () => {
    const wrapper = mountKeepAlive()
    await nextTick()

    expect(addPageMock).toHaveBeenCalledTimes(1)

    const firstInstanceId = wrapper
      .find('[data-test="wrapped-page"]')
      .attributes('data-instance-id')

    activeCacheKey.value = 'cache-b'
    await nextTick()

    const secondInstanceId = wrapper
      .find('[data-test="wrapped-page"]')
      .attributes('data-instance-id')

    expect(secondInstanceId).not.toBe(firstInstanceId)
    expect(addPageMock).toHaveBeenCalledTimes(1)
  })

  it('refreshKey 变化时重建缓存页实例并重新调用 addPage', async () => {
    const wrapper = mountKeepAlive()
    await nextTick()

    expect(addPageMock).toHaveBeenCalledTimes(1)

    const firstInstanceId = wrapper
      .find('[data-test="wrapped-page"]')
      .attributes('data-instance-id')

    refreshKey.value = 8
    await nextTick()

    const secondInstanceId = wrapper
      .find('[data-test="wrapped-page"]')
      .attributes('data-instance-id')

    expect(secondInstanceId).not.toBe(firstInstanceId)
    expect(addPageMock).toHaveBeenCalledTimes(2)
  })

  it('把缓存页 onLoaded 事件转发为 loaded', async () => {
    const wrapper = mountKeepAlive()

    await wrapper.find('[data-test="wrapped-page"]').trigger('click')

    expect(wrapper.emitted('loaded')).toHaveLength(1)
  })

  it('把页面转场配置传给 transition', () => {
    const wrapper = mountKeepAlive('custom-transition')
    const transition = wrapper.find('[data-test="transition-stub"]')

    expect(transition.attributes('data-transition-name')).toBe('custom-transition')
    expect(transition.attributes('data-transition-appear')).toBe('true')
    expect(transition.attributes('data-transition-mode')).toBe('out-in')
    expect(wrapper.find('[data-test="wrapped-page"]').exists()).toBe(true)
  })
})
