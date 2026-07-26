// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import StackTabs from '@/lib/StackTabs.vue'
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
})
