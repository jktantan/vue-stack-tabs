// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { ITabItem } from '@/lib/model/TabModel'
import StackTabs from '@/lib/StackTabs.vue'

const tabs = ref<ITabItem[]>([])
const iframeRefreshKeys = ref<Record<string, number>>({})
const destroyMock = vi.fn()
const initializeMock = vi.fn()
const setMaxSizeMock = vi.fn()
const setGlobalScrollMock = vi.fn()
const setSessionPrefixMock = vi.fn()
const setIFramePathMock = vi.fn()
const openTabMock = vi.fn()
const openInNewWindowMock = vi.fn()

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    changeLocale: vi.fn()
  })
}))

vi.mock('@/lib/i18n/stackTabsLocale', () => ({
  applyStackTabsLocale: vi.fn()
}))

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    tabs,
    iframeRefreshKeys,
    destroy: destroyMock,
    initialize: initializeMock,
    setMaxSize: setMaxSizeMock,
    setGlobalScroll: setGlobalScrollMock,
    setSessionPrefix: setSessionPrefixMock
  })
}))

vi.mock('@/lib/hooks/useTabActions', () => ({
  default: () => ({
    setIFramePath: setIFramePathMock,
    openTab: openTabMock,
    openInNewWindow: openInNewWindowMock
  })
}))

const TabHeaderStub = defineComponent({
  name: 'TabHeader',
  emits: ['active'],
  setup() {
    return () => h('nav', { 'data-test': 'tab-header' })
  }
})

const StackKeepAliveStub = defineComponent({
  name: 'StackKeepAlive',
  emits: ['loaded'],
  setup() {
    return () => h('main', { 'data-test': 'stack-keep-alive' })
  }
})

function makeIframeTab(overrides: Partial<ITabItem> = {}): ITabItem {
  return {
    id: 'frame-1',
    title: 'Reports',
    closable: true,
    refreshable: true,
    iframe: true,
    iframeRefreshMode: 'reload',
    url: 'https://example.com/reports',
    active: true,
    pages: { list: () => [] } as unknown as ITabItem['pages'],
    ...overrides
  }
}

function mountStackTabs(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(StackTabs, {
    props: {
      iframePath: '/__iframe',
      ...props
    },
    slots,
    global: {
      stubs: {
        TabHeader: TabHeaderStub,
        StackKeepAlive: StackKeepAliveStub,
        transition: false,
        Transition: false,
        TransitionGroup: false
      }
    }
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  tabs.value = [makeIframeTab()]
  iframeRefreshKeys.value = {}
  destroyMock.mockReset()
  initializeMock.mockReset()
  setMaxSizeMock.mockReset()
  setGlobalScrollMock.mockReset()
  setSessionPrefixMock.mockReset()
  setIFramePathMock.mockReset()
  openTabMock.mockReset()
  openInNewWindowMock.mockReset()
})

describe('StackTabs iframe security and states', () => {
  it('iframe 带有 title、sandbox、referrerpolicy 和 allow', () => {
    const wrapper = mountStackTabs({
      iframeSandbox: 'allow-scripts',
      iframeReferrerPolicy: 'no-referrer',
      iframeAllow: 'fullscreen'
    })

    const iframe = wrapper.get('iframe.stack-tab__iframe')
    expect(iframe.attributes('title')).toBe('Reports')
    expect(iframe.attributes('sandbox')).toBe('allow-scripts')
    expect(iframe.attributes('referrerpolicy')).toBe('no-referrer')
    expect(iframe.attributes('allow')).toBe('fullscreen')
  })

  it('iframe 使用默认 sandbox 和 referrerpolicy，空 sandbox 会移除属性', () => {
    const wrapper = mountStackTabs()
    const iframe = wrapper.get('iframe.stack-tab__iframe')

    expect(iframe.attributes('sandbox')).toBe(
      'allow-scripts allow-forms allow-popups allow-downloads allow-same-origin'
    )
    expect(iframe.attributes('referrerpolicy')).toBe('strict-origin-when-cross-origin')

    const unsafeWrapper = mountStackTabs({ iframeSandbox: '' })
    expect(unsafeWrapper.get('iframe.stack-tab__iframe').attributes('sandbox')).toBeUndefined()
  })

  it('iframe loading 使用 status 语义', () => {
    const wrapper = mountStackTabs()

    const loading = wrapper.get('.stack-tab__iframe-loading')
    expect(loading.attributes('role')).toBe('status')
    expect(loading.attributes('aria-live')).toBe('polite')
    expect(loading.attributes('aria-label')).toBe('VueStackTab.loading')
  })

  it('加载超时后显示 iframeError slot 并可重试', async () => {
    const wrapper = mountStackTabs(
      { iframeLoadTimeout: 50 },
      {
        iframeError:
          '<template #iframeError="{ tab, retry }"><button data-test="retry" @click="retry(tab.id)">retry {{ tab.id }}</button></template>'
      }
    )

    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()

    const retryButton = wrapper.get('[data-test="retry"]')
    expect(retryButton.text()).toContain('frame-1')

    await retryButton.trigger('click')
    expect(wrapper.find('.stack-tab__iframe-loading').exists()).toBe(true)
  })

  it('默认 iframe 错误态包含重试和新窗口打开备用操作', async () => {
    const wrapper = mountStackTabs({ iframeLoadTimeout: 50 })

    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.stack-tab__iframe-error').attributes('role')).toBe('alert')
    expect(wrapper.get('.stack-tab__iframe-error-text').text()).toBe('VueStackTab.iframeLoadTimeout')

    await wrapper.get('.stack-tab__iframe-error-retry').trigger('click')
    expect(wrapper.find('.stack-tab__iframe-loading').exists()).toBe(true)

    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()
    await wrapper.get('.stack-tab__iframe-error-open').trigger('click')
    expect(openInNewWindowMock).toHaveBeenCalledWith('frame-1')
  })

  it('reload refresh key 变化后重新进入 loading', async () => {
    const wrapper = mountStackTabs()
    await wrapper.get('iframe.stack-tab__iframe').trigger('load')
    expect(wrapper.find('.stack-tab__iframe-loading').exists()).toBe(false)

    iframeRefreshKeys.value = { 'frame-1': 1 }
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stack-tab__iframe-loading').exists()).toBe(true)
  })
})
