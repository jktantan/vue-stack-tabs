// @vitest-environment happy-dom
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Component, DefineComponent, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import StackCacheRenderer from '@/lib/components/StackKeepAlive/StackCacheRenderer.vue'

const refreshKey = ref(0)
const activeCacheKey = ref('cache-a')
const addPageMock = vi.fn()

enableAutoUnmount(afterEach)

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    refreshKey,
    activeCacheKey,
    addPage: addPageMock
  })
}))

interface RendererSlotProps {
  wrappedComponent: DefineComponent
  activeCacheKey: string
  refreshKey: number
  component?: VNode | null
}

function makeRoute(fullPath = '/dashboard'): RouteLocationNormalizedLoaded {
  const url = new URL(fullPath, 'https://stack-tabs.test')
  const path = url.pathname

  return {
    path,
    matched: [{ path }] as RouteLocationNormalizedLoaded['matched'],
    query: Object.fromEntries(url.searchParams.entries()),
    params: {},
    hash: url.hash,
    fullPath,
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

const AlternatePageComponent = defineComponent({
  name: 'AlternatePageComponent',
  setup() {
    return () => h('section', { 'data-test': 'alternate-page-component' }, 'alternate')
  }
})

const WrappedPage = defineComponent({
  name: 'wrapped-cache-page',
  props: {
    vnode: {
      type: Object,
      required: false,
      default: undefined
    }
  },
  setup(props) {
    return () =>
      h(
        'article',
        {
          'data-test': 'wrapped-page',
          'data-has-vnode': props.vnode ? 'true' : 'false'
        },
        'wrapped'
      )
  }
})

function makeComponent(component: Component = PageComponent): VNode {
  return h(component)
}

function mountRenderer(props?: {
  route?: RouteLocationNormalizedLoaded
  component?: VNode | null
}) {
  return mount(StackCacheRenderer, {
    props: {
      route: props?.route ?? makeRoute(),
      component: props?.component ?? makeComponent()
    },
    slots: {
      default: ({ wrappedComponent, activeCacheKey, refreshKey, component }: RendererSlotProps) =>
        h(wrappedComponent, {
          vnode: component,
          key: `${activeCacheKey}-${refreshKey}`
        })
    }
  })
}

beforeEach(() => {
  refreshKey.value = 0
  activeCacheKey.value = 'cache-a'
  addPageMock.mockReset()
  addPageMock.mockReturnValue(WrappedPage)
})

describe('StackCacheRenderer', () => {
  it('首次渲染时调用 addPage 并通过插槽渲染包装组件', async () => {
    const wrapper = mountRenderer()
    await nextTick()

    expect(addPageMock).toHaveBeenCalledTimes(1)
    expect(addPageMock.mock.calls[0]?.[0]).toMatchObject({ path: '/dashboard' })
    expect(addPageMock.mock.calls[0]?.[1]).toBeTruthy()
    expect(wrapper.find('[data-test="wrapped-page"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wrapped-page"]').attributes('data-has-vnode')).toBe('true')
  })

  it('activeCacheKey 变化时不重复调用 addPage', async () => {
    mountRenderer()
    await nextTick()

    activeCacheKey.value = 'cache-b'
    await nextTick()

    expect(addPageMock).toHaveBeenCalledTimes(1)
  })

  it('仅 __tab 查询参数变化时重新调用 addPage', async () => {
    const wrapper = mountRenderer({ route: makeRoute('/dashboard?__tab=cache-a') })
    await nextTick()

    await wrapper.setProps({ route: makeRoute('/dashboard?__tab=cache-b') })

    expect(addPageMock).toHaveBeenCalledTimes(2)
    expect(addPageMock.mock.calls[1]?.[0]).toMatchObject({
      path: '/dashboard',
      query: { __tab: 'cache-b' }
    })
  })

  it('refreshKey 变化时重新调用 addPage', async () => {
    mountRenderer()
    await nextTick()

    refreshKey.value = 1
    await nextTick()

    expect(addPageMock).toHaveBeenCalledTimes(2)
  })

  it('route fullPath 变化时重新调用 addPage', async () => {
    const wrapper = mountRenderer()
    await nextTick()

    await wrapper.setProps({ route: makeRoute('/reports') })

    expect(addPageMock).toHaveBeenCalledTimes(2)
    expect(addPageMock.mock.calls[1]?.[0]).toMatchObject({ path: '/reports' })
  })

  it('同组件类型的新 VNode 不重复调用 addPage', async () => {
    const wrapper = mountRenderer()
    await nextTick()

    await wrapper.setProps({ component: makeComponent(PageComponent) })

    expect(addPageMock).toHaveBeenCalledTimes(1)
  })

  it('组件类型变化时重新调用 addPage', async () => {
    const wrapper = mountRenderer()
    await nextTick()

    const nextComponent = makeComponent(AlternatePageComponent)
    await wrapper.setProps({ component: nextComponent })

    expect(addPageMock).toHaveBeenCalledTimes(2)
    expect(addPageMock.mock.calls[1]?.[1]).toBe(nextComponent)
  })
})
