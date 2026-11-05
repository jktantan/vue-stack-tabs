// @vitest-environment happy-dom
/**
 * StackTabs 容器背景：
 * - 默认不写内联样式，由 --stack-tab-background（默认跟随 --stack-tab-surface）控制；
 * - 传入 background prop 时直接写入根元素，优先级高于 CSS 变量。
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import StackTabs from '@/lib/StackTabs.vue'

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({ t: (key: string) => key, changeLocale: vi.fn() })
}))
vi.mock('@/lib/i18n/stackTabsLocale', () => ({ applyStackTabsLocale: vi.fn() }))

const Page = defineComponent({
  name: 'BackgroundTestPage',
  setup() {
    return () => h('p', 'page')
  }
})

const BackgroundComponent = defineComponent({
  name: 'BackgroundTestBackdrop',
  setup() {
    return () => h('div', { class: 'test-backdrop' })
  }
})

afterEach(() => {
  window.sessionStorage.clear()
})
enableAutoUnmount(afterEach)

const mountStackTabs = async (background?: string, backgroundSlot = false) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Page },
      { path: '/iframe', component: Page }
    ]
  })
  await router.push('/')
  await router.isReady()

  const wrapper = mount(StackTabs, {
    props: {
      iframePath: '/iframe',
      pageTransition: '',
      pageTransitionBack: '',
      ...(background === undefined ? {} : { background })
    },
    slots: backgroundSlot ? { background: () => h(BackgroundComponent) } : {},
    global: { plugins: [router] }
  })

  await flushPromises()
  return wrapper
}

describe('StackTabs 容器背景', () => {
  it('未传 background 时不写内联背景，交给 CSS 变量控制', async () => {
    const wrapper = await mountStackTabs()
    const root = wrapper.find('.stack-tab')

    expect(root.exists()).toBe(true)
    expect(root.attributes('style') ?? '').not.toContain('background')
  })

  it('传入 background 时写入根元素内联样式', async () => {
    const wrapper = await mountStackTabs('rgb(1, 2, 3)')
    const root = wrapper.find('.stack-tab').element as HTMLElement

    expect(root.style.background).toBe('rgb(1, 2, 3)')
  })

  it('未传 background 插槽时不渲染背景层', async () => {
    const wrapper = await mountStackTabs()

    expect(wrapper.find('.stack-tab__background').exists()).toBe(false)
  })

  it('传入 background 插槽时渲染组件，并位于页签头之前', async () => {
    const wrapper = await mountStackTabs(undefined, true)
    const root = wrapper.find('.stack-tab')
    const backgroundLayer = root.find('.stack-tab__background')

    expect(backgroundLayer.exists()).toBe(true)
    expect(backgroundLayer.find('.test-backdrop').exists()).toBe(true)
    expect(root.element.firstElementChild).toBe(backgroundLayer.element)
  })
})
