/**
 * homeTab：固定首页的初始化、无 __tab 回落、无效 __tab 与 404 行为。
 */
// @vitest-environment happy-dom
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import StackTabs from '@/lib/StackTabs.vue'
import { decodeTabInfo, encodeTabInfo } from '@/lib/utils/tabInfoEncoder'
import type { ITabData } from '@/lib/model/TabModel'

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({ t: (key: string) => key, changeLocale: vi.fn() })
}))
vi.mock('@/lib/i18n/stackTabsLocale', () => ({ applyStackTabsLocale: vi.fn() }))

const HOME_ID = '__stack_tabs_home__'

const HomeView = defineComponent({ name: 'HomeView', setup: () => () => h('p', 'home') })
const SettingsView = defineComponent({
  name: 'SettingsView',
  setup: () => () => h('p', 'settings')
})
const OtherView = defineComponent({ name: 'OtherView', setup: () => () => h('p', 'other') })
const NotFoundView = defineComponent({
  name: 'NotFoundView',
  setup: () => () => h('p', 'not found')
})

afterEach(() => {
  window.sessionStorage.clear()
})
enableAutoUnmount(afterEach)

const settle = async () => {
  await flushPromises()
  await nextTick()
}

interface MountOptions {
  initialPath?: string
  query?: Record<string, string>
  defaultTabs?: ITabData[]
  homeTab?: ITabData
}

const mountStackTabs = async (options: MountOptions = {}) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/settings', component: SettingsView },
      { path: '/other', component: OtherView },
      { path: '/iframe', component: HomeView },
      { path: '/:pathMatch(.*)*', component: NotFoundView }
    ]
  })
  await router.push({ path: options.initialPath ?? '/', query: options.query })
  await router.isReady()

  const wrapper = mount(StackTabs, {
    props: {
      iframePath: '/iframe',
      defaultTabs: options.defaultTabs ?? [],
      homeTab: options.homeTab,
      pageTransition: '',
      pageTransitionBack: ''
    },
    global: { plugins: [router] }
  })

  // 首屏可能先渲染占位、再 replace 到 home，多等几拍让路由稳定。
  await settle()
  await settle()
  await settle()

  return { wrapper, router }
}

describe('homeTab', () => {
  it('位于首位、不可关闭、不可拖动，并把 __tab 写回地址', async () => {
    const { wrapper, router } = await mountStackTabs({
      homeTab: { title: '首页', path: '/' }
    })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(1)
    expect(tabs[0]?.attributes('data-tab-id')).toBe(HOME_ID)
    expect(tabs[0]?.text()).toContain('首页')
    expect(wrapper.find('.stack-tab__item-button').exists()).toBe(false)
    expect(wrapper.find('.stack-tab__item').attributes('draggable')).toBe('false')
    expect(decodeTabInfo(String(router.currentRoute.value.query.__tab)).id).toBe(HOME_ID)
  })

  it('无 __tab 且路径没有归属时重定向到 home 的 path', async () => {
    const { wrapper, router } = await mountStackTabs({
      initialPath: '/other',
      homeTab: { title: '首页', path: '/' }
    })

    expect(router.currentRoute.value.path).toBe('/')
    expect(decodeTabInfo(String(router.currentRoute.value.query.__tab)).id).toBe(HOME_ID)
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(1)
  })

  it('无 __tab 但命中 defaultTabs 时归属该标签而不是 home', async () => {
    const { wrapper, router } = await mountStackTabs({
      initialPath: '/settings',
      homeTab: { title: '首页', path: '/' },
      defaultTabs: [{ id: 'settings', title: '设置', path: '/settings' }]
    })

    expect(router.currentRoute.value.path).toBe('/settings')
    expect(decodeTabInfo(String(router.currentRoute.value.query.__tab)).id).toBe('settings')
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.attributes('data-tab-id'))).toEqual([
      HOME_ID,
      'settings'
    ])
    expect(
      wrapper
        .findAll('[role="tab"]')
        .find((tab) => tab.attributes('aria-selected') === 'true')
        ?.attributes('data-tab-id')
    ).toBe('settings')
  })

  it('无效 __tab 保持现状：新建独立标签，不重定向 home', async () => {
    const { wrapper, router } = await mountStackTabs({
      initialPath: '/other',
      query: { __tab: 'invalid' },
      homeTab: { title: '首页', path: '/' }
    })

    expect(router.currentRoute.value.path).toBe('/other')
    const ids = wrapper.findAll('[role="tab"]').map((tab) => tab.attributes('data-tab-id'))
    expect(ids).toHaveLength(2)
    expect(ids[0]).toBe(HOME_ID)
    expect(ids[1]).not.toBe(HOME_ID)
  })

  it('带有效 __tab 的未知页面交给 404 路由，不重定向 home', async () => {
    const encoded = encodeTabInfo({
      id: 'missing-tab',
      title: '不存在',
      closable: true,
      refreshable: true,
      iframe: false
    })
    const { wrapper, router } = await mountStackTabs({
      initialPath: '/not-exist',
      query: { __tab: encoded },
      homeTab: { title: '首页', path: '/' }
    })

    expect(router.currentRoute.value.path).toBe('/not-exist')
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.attributes('data-tab-id'))).toEqual([
      HOME_ID,
      'missing-tab'
    ])
    expect(wrapper.text()).toContain('not found')
  })
})
