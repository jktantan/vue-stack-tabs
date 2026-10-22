// @vitest-environment happy-dom
/**
 * 回归：同一标签内的前进/后退只修改页面栈，不应重建整个 tabs 视图数组。
 *
 * 以前 appendPage / activateTab 都会 syncTabsView()，一次标签内导航会把 TabHeader
 * 的 v-for、iframe computed、activePageRefreshVersion 等全部重新求值。
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, watch } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import StackTabs from '@/lib/StackTabs.vue'
import useTabActions from '@/lib/hooks/useTabActions'
import useTabPanel from '@/lib/hooks/useTabPanel'
import { Stack } from '@/lib/model/TabModel'
import type { ITabData } from '@/lib/model/TabModel'

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({ t: (key: string) => key, changeLocale: vi.fn() })
}))
vi.mock('@/lib/i18n/stackTabsLocale', () => ({ applyStackTabsLocale: vi.fn() }))

enableAutoUnmount(afterEach)

afterEach(() => {
  window.sessionStorage.clear()
})

const View = (name: string) =>
  defineComponent({
    name,
    setup() {
      return () => h('p', name)
    }
  })

const settle = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
  await nextTick()
}

const mountStackTabs = async (
  defaultTabs: ITabData[] = [{ id: 'home', title: 'Home', path: '/' }]
) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: View('HomeView') },
      { path: '/a', component: View('AView') },
      { path: '/b', component: View('BView') },
      { path: '/iframe', component: View('IframeView') }
    ]
  })
  await router.push({ path: '/' })
  await router.isReady()

  let replacements = 0
  let panel!: ReturnType<typeof useTabPanel>
  let actions!: ReturnType<typeof useTabActions>

  const Probe = defineComponent({
    name: 'TabPanelProbe',
    setup() {
      panel = useTabPanel()
      actions = useTabActions()
      watch(
        () => panel.tabs.value,
        () => replacements++,
        { flush: 'sync' }
      )
      return () => null
    }
  })

  const wrapper = mount(StackTabs, {
    props: {
      iframePath: '/iframe',
      defaultTabs,
      pageTransition: '',
      pageTransitionBack: ''
    },
    global: { plugins: [router] },
    slots: { leftButton: () => h(Probe) }
  })
  await settle()

  return {
    router,
    wrapper,
    panel: () => panel,
    actions: () => actions,
    resetReplacements: () => {
      replacements = 0
    },
    replacements: () => replacements
  }
}

describe('标签内导航的渲染耦合', () => {
  it('同一标签内连续前进不会重建 tabs 数组，页面栈正常增长', async () => {
    const { router, panel, resetReplacements, replacements } = await mountStackTabs()
    const encodedTab = String(router.currentRoute.value.query.__tab)
    expect(encodedTab).not.toBe('')

    resetReplacements()
    await router.push({ path: '/a', query: { __tab: encodedTab } })
    await settle()
    await router.push({ path: '/b', query: { __tab: encodedTab } })
    await settle()

    expect(
      panel()
        .getPages('home')
        .map((page) => page.path)
    ).toEqual(['/', '/a', '/b'])
    expect(panel().getTopPage('home')?.path).toBe('/b')
    expect(replacements()).toBe(0)
  })

  it('切换到另一个标签仍需要重建 tabs 数组（active 标记变化）', async () => {
    const { router, panel, resetReplacements, replacements } = await mountStackTabs()
    const encodedTab = String(router.currentRoute.value.query.__tab)

    resetReplacements()
    await router.push({ path: '/a', query: { __tab: encodedTab } })
    await settle()
    expect(replacements()).toBe(0)

    await panel().addTab({
      id: 'second',
      title: 'Second',
      closable: true,
      refreshable: true,
      iframe: false,
      active: false,
      pages: new Stack([{ id: 'second-p1', tabId: 'second', path: '/b', query: {} }])
    })
    await panel().active('second', false)
    expect(replacements()).toBeGreaterThan(0)
  })

  it('renew 当前标签的同地址导航会 resolve，并保留一个页面', async () => {
    const { actions, panel, router } = await mountStackTabs()
    expect(panel().getPages('home')).toHaveLength(1)

    await expect(actions().openTab({ id: 'home', title: 'Home', path: '/' }, true)).resolves.toBe(
      'home'
    )
    await settle()

    expect(panel().tabs.value).toHaveLength(1)
    expect(panel().getPages('home')).toHaveLength(1)
    expect(panel().getTopPage('home')?.path).toBe('/')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('default-tabs 中的 iframe 标签使用 iframePath + __src 承载', async () => {
    const externalUrl = 'https://example.com/report?x=1'
    const { wrapper, panel } = await mountStackTabs([
      { id: 'home', title: 'Home', path: '/' },
      { id: 'ext', title: 'External', path: externalUrl, iframe: true }
    ])

    const ext = panel().getTab('ext')
    expect(ext?.iframe).toBe(true)
    expect(ext?.url).toBe(externalUrl)
    expect(ext?.iframeRefreshMode).toBe('reload')
    expect(panel().getTopPage('ext')?.path).toBe('/iframe')
    expect(panel().getTopPage('ext')?.query?.__src).toBe(encodeURIComponent(externalUrl))

    await panel().active('ext')
    await settle()
    expect(wrapper.find('iframe').attributes('src')).toBe(externalUrl)
  })
})
