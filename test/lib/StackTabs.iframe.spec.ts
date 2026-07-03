// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
const stackTabStyles = readFileSync(resolve(process.cwd(), 'src/lib/assets/style/stackTab.scss'), 'utf8')

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

  it('iframe wrapper 作为 tabpanel 关联对应 tab', () => {
    const wrapper = mountStackTabs()
    const panel = wrapper.get('.stack-tab__iframe-wrapper')

    expect(panel.attributes('role')).toBe('tabpanel')
    expect(panel.attributes('id')).toBe('stack-tab-panel-frame-1')
    expect(panel.attributes('aria-labelledby')).toBe('stack-tab-tab-frame-1')
  })

  it('非 iframe 活动内容容器作为 tabpanel 关联对应 tab', () => {
    tabs.value = [makeIframeTab({ id: 'page-1', iframe: false, url: undefined, active: true })]
    const wrapper = mountStackTabs()
    const panel = wrapper.get('.stack-tab__keep-alive-panel')

    expect(panel.attributes('role')).toBe('tabpanel')
    expect(panel.attributes('id')).toBe('stack-tab-panel-page-1')
    expect(panel.attributes('aria-labelledby')).toBe('stack-tab-tab-page-1')
    expect(panel.isVisible()).toBe(true)
  })

  it('iframe 激活时隐藏非 iframe tabpanel，避免旧页面暴露给读屏', () => {
    const wrapper = mountStackTabs()
    const panel = wrapper.get('.stack-tab__keep-alive-panel')

    expect(panel.attributes('role')).toBeUndefined()
    expect(panel.attributes('aria-hidden')).toBe('true')
    expect(panel.attributes()).toHaveProperty('hidden')
    expect(panel.isVisible()).toBe(false)
  })

  it('非 iframe tabpanel 全高承载 keep-alive 内容', () => {
    expect(stackTabStyles).toMatch(/&__keep-alive-panel\s*\{[\s\S]*width: 100%/)
    expect(stackTabStyles).toMatch(/&__keep-alive-panel\s*\{[\s\S]*height: 100%/)
  })

  it('iframe loading 使用 status 语义', () => {
    const wrapper = mountStackTabs()

    const loading = wrapper.get('.stack-tab__iframe-loading')
    expect(loading.attributes('role')).toBe('status')
    expect(loading.attributes('aria-live')).toBe('polite')
    expect(loading.attributes('aria-label')).toBe('VueStackTab.loading')
  })

  it('iframe 错误态样式覆盖 iframe 且保留点击能力', () => {
    expect(stackTabStyles).toMatch(/&__iframe-error\s*\{[\s\S]*position: absolute/)
    expect(stackTabStyles).toMatch(/&__iframe-error\s*\{[\s\S]*top: 0/)
    expect(stackTabStyles).toMatch(/&__iframe-error\s*\{[\s\S]*left: 0/)
    expect(stackTabStyles).toMatch(/&__iframe-error\s*\{[\s\S]*z-index: 2/)
    expect(stackTabStyles).toMatch(/&__iframe-error\s*\{[\s\S]*width: 100%/)
    expect(stackTabStyles).toMatch(/&__iframe-error\s*\{[\s\S]*height: 100%/)
    expect(stackTabStyles).toMatch(/&__iframe-error\s*\{[\s\S]*pointer-events: auto/)
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

  it('未激活 iframe 的 about:blank load 不会阻止首次真实激活 loading', async () => {
    tabs.value = [makeIframeTab({ active: false })]
    const wrapper = mountStackTabs()

    await wrapper.get('iframe.stack-tab__iframe').trigger('load')
    tabs.value = [makeIframeTab({ active: true })]
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stack-tab__iframe-loading').exists()).toBe(true)
  })

  it('postMessage 模式的错误态重试也会强制重建 iframe', async () => {
    tabs.value = [makeIframeTab({ iframeRefreshMode: 'postMessage' })]
    const wrapper = mountStackTabs({ iframeLoadTimeout: 50 })
    const beforeSrc = wrapper.get('iframe.stack-tab__iframe').attributes('src')

    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()
    await wrapper.get('.stack-tab__iframe-error-retry').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const iframeSrcs = wrapper
      .findAll('iframe.stack-tab__iframe')
      .map((iframe) => iframe.attributes('src') ?? '')
    const iframeRefreshKeyAttrs = wrapper
      .findAll('iframe.stack-tab__iframe')
      .map((iframe) => iframe.attributes('data-refresh-key') ?? '')
    expect(wrapper.find('.stack-tab__iframe-loading').exists()).toBe(true)
    expect(iframeRefreshKeys.value['frame-1']).toBe(1)
    expect(beforeSrc).not.toContain('__stack_tabs_refresh=1')
    expect(iframeSrcs).toContain('https://example.com/reports?__stack_tabs_refresh=1')
    expect(iframeRefreshKeyAttrs).toContain('1')
  })

  it('retry 后外部 refresh key 变化会使用最新 iframe src', async () => {
    const wrapper = mountStackTabs({ iframeLoadTimeout: 50 })

    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()
    await wrapper.get('.stack-tab__iframe-error-retry').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const retrySrcs = wrapper
      .findAll('iframe.stack-tab__iframe')
      .map((iframe) => iframe.attributes('src') ?? '')
    expect(retrySrcs).toContain('https://example.com/reports?__stack_tabs_refresh=1')

    iframeRefreshKeys.value = { 'frame-1': 2 }
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const refreshedSrcs = wrapper
      .findAll('iframe.stack-tab__iframe')
      .map((iframe) => iframe.attributes('src') ?? '')
    expect(refreshedSrcs).toContain('https://example.com/reports?__stack_tabs_refresh=2')
  })

  it('retry 追加 refresh key 时保留相对 iframe URL 形态', async () => {
    tabs.value = [makeIframeTab({ url: 'settings/profile?section=billing#usage' })]
    const wrapper = mountStackTabs({ iframeLoadTimeout: 50 })

    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()
    await wrapper.get('.stack-tab__iframe-error-retry').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const iframeSrcs = wrapper
      .findAll('iframe.stack-tab__iframe')
      .map((iframe) => iframe.attributes('src') ?? '')
    expect(iframeSrcs).toContain(
      'settings/profile?section=billing&__stack_tabs_refresh=1#usage'
    )
  })

  it('retry 后 DOM 替换前的旧 iframe load 不会结束新 iframe loading', async () => {
    const wrapper = mountStackTabs({ iframeLoadTimeout: 50 })
    const staleIframe = wrapper.get('iframe.stack-tab__iframe')

    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()
    const clickPromise = wrapper.get('.stack-tab__iframe-error-retry').trigger('click')
    await staleIframe.trigger('load')
    await clickPromise
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stack-tab__iframe-loading').exists()).toBe(true)
  })

  it('关闭 iframe tab 后清理 pending timeout，不再显示 stale 错误态', async () => {
    const wrapper = mountStackTabs({ iframeLoadTimeout: 50 })

    tabs.value = []
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.stack-tab__iframe-error').exists()).toBe(false)
  })
})
