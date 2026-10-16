/**
 * 首屏标签归属：URL 上没有 __tab（用户直接打开默认路由）时，
 * 当前路由应归属到 defaultTabs 里 path 匹配的标签，并把 __tab 写回地址，
 * 而不是额外生成一个「未命名」的兜底标签。
 */
// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import StackTabs from '@/lib/StackTabs.vue'
import { decodeTabInfo } from '@/lib/utils/tabInfoEncoder'

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({ t: (key: string) => key, changeLocale: vi.fn() })
}))
vi.mock('@/lib/i18n/stackTabsLocale', () => ({ applyStackTabsLocale: vi.fn() }))

const HomeView = defineComponent({
  name: 'DefaultTabHome',
  setup() {
    return () => h('p', 'home')
  }
})

afterEach(() => {
  window.sessionStorage.clear()
})
enableAutoUnmount(afterEach)

const settle = async () => {
  await flushPromises()
  await nextTick()
}

const mountStackTabs = async (defaultTabs: { id: string; title: string; path: string }[]) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/iframe', component: HomeView }
    ]
  })
  // 关键：首屏 URL 不带 __tab
  await router.push({ path: '/' })
  await router.isReady()

  const wrapper = mount(StackTabs, {
    props: {
      iframePath: '/iframe',
      defaultTabs,
      pageTransition: '',
      pageTransitionBack: ''
    },
    global: { plugins: [router] }
  })

  await settle()
  await settle()

  return { wrapper, router }
}

describe('首屏 URL 没有 __tab 时的标签归属', () => {
  it('把当前路由归属到 path 匹配的默认标签，并写回 __tab', async () => {
    const { wrapper, router } = await mountStackTabs([{ id: 'home', title: '首页', path: '/' }])

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(1)
    expect(tabs[0].attributes('data-tab-id')).toBe('home')
    expect(tabs[0].text()).toContain('首页')

    const encoded = router.currentRoute.value.query.__tab
    expect(typeof encoded).toBe('string')
    expect(decodeTabInfo(String(encoded)).id).toBe('home')
  })

  it('session 恢复了其它标签时，首屏路由仍归属 path 匹配的默认标签', async () => {
    // 上次会话停留在 /iframe（例如演示应用重新加载后 hash 为空，首屏路由是 /）
    window.sessionStorage.setItem(
      'stacktab-active-tab',
      JSON.stringify({
        id: 'restored',
        title: '恢复的标签',
        closable: true,
        refreshable: true,
        iframe: false,
        iframeRefreshMode: 'postMessage',
        active: true,
        pages: [{ id: 'restored-page', tabId: 'restored', path: '/iframe', query: {} }]
      })
    )

    const { wrapper, router } = await mountStackTabs([{ id: 'home', title: '首页', path: '/' }])

    const tabIds = wrapper.findAll('[role="tab"]').map((tab) => tab.attributes('data-tab-id'))
    expect(tabIds).toEqual(['home', 'restored'])
    expect(decodeTabInfo(String(router.currentRoute.value.query.__tab)).id).toBe('home')
  })

  it('没有匹配的默认标签时才创建兜底标签', async () => {
    // 默认标签的 path 与当前路由（/）不一致 → 只能新建承载标签
    const { wrapper } = await mountStackTabs([{ id: 'other', title: '其它', path: '/iframe' }])

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2) // 默认标签 other + 无归属时新建的兜底标签
    expect(tabs.some((tab) => tab.attributes('data-tab-id') === 'other')).toBe(true)
  })
})
