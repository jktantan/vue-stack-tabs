/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { DefineComponent } from 'vue'
import { decodeTabInfo } from '@/lib/utils/tabInfoEncoder'
import type { ITabItem } from '@/lib/model/TabModel'

const push = vi.fn()
const emit = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  isNavigationFailure: (value: unknown) =>
    typeof value === 'object' && value !== null && 'type' in value
}))

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

vi.mock('@/lib/hooks/useTabEventBus', () => ({
  TabEventType: {
    PAGE_LOADING: 'PAGE_LOADING',
    TAB_ACTIVE: 'TAB_ACTIVE',
    FORWARD: 'FORWARD',
    BACKWARD: 'BACKWARD',
    REFRESH_IFRAME_POSTMESSAGE: 'REFRESH_IFRAME_POSTMESSAGE'
  },
  useTabEmitter: () => ({ emit })
}))

function mockRoute(path: string, matchedPath?: string): RouteLocationNormalizedLoaded {
  return {
    path,
    matched: [{ path: matchedPath ?? path }] as RouteLocationNormalizedLoaded['matched'],
    query: {},
    params: {},
    hash: '',
    fullPath: path,
    name: undefined,
    meta: {},
    redirectedFrom: undefined
  }
}

async function withRuntimeContext() {
  const contextModule = await import('@/lib/hooks/stackTabsContext')
  const active = contextModule.getActiveStackTabsRuntimeContext()
  if (active) contextModule.unregisterStackTabsRuntimeContext(active)

  const context = contextModule.createStackTabsRuntimeContext()
  contextModule.registerStackTabsRuntimeContext(context, { isProduction: false })

  return {
    context,
    cleanup: () => contextModule.unregisterStackTabsRuntimeContext(context)
  }
}

describe('normalizePathForCache', () => {
  it('当 matched.path 无尾斜杠且 route.path 有尾斜杠时，返回规范化 path', async () => {
    const { normalizePathForCache } = await import('@/lib/hooks/useTabPanel')
    const r = mockRoute('/dashboard/', '/dashboard')
    expect(normalizePathForCache(r)).toBe('/dashboard')
  })

  it('路径与 matched 一致时返回规范化 path', async () => {
    const { normalizePathForCache } = await import('@/lib/hooks/useTabPanel')
    const r = mockRoute('/home', '/home')
    expect(normalizePathForCache(r)).toBe('/home')
  })

  it('路径与 matched 不一致时返回原 path', async () => {
    const { normalizePathForCache } = await import('@/lib/hooks/useTabPanel')
    const r = mockRoute('/detail/1', '/detail/:id')
    expect(normalizePathForCache(r)).toBe('/detail/1')
  })
})

describe('useTabPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    push.mockReset()
    emit.mockReset()
    window.sessionStorage.clear()
    push.mockResolvedValue(undefined)
  })

  it('initialize 忽略 defaultTabs path query 中的保留 __tab，保留普通 query', async () => {
    const runtime = await withRuntimeContext()
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()

    panel.initialize([
      {
        id: 'default-tab',
        title: '默认页',
        path: '/home?__tab=attacker&foo=1'
      }
    ])

    const page = panel.tabs.value[0]?.pages.peek()
    expect(page?.query?.foo).toBe('1')
    expect(page?.query?.__tab).not.toBe('attacker')
    expect(decodeTabInfo(String(page?.query?.__tab))).toMatchObject({
      id: 'default-tab',
      title: '默认页'
    })

    panel.destroy()
    runtime.cleanup()
  })

  it('initialize 恢复 session iframe tab 时清洗非法 url', async () => {
    const runtime = await withRuntimeContext()
    const { Stack } = await import('@/lib/model/TabModel')
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()
    window.sessionStorage.setItem(
      'stacktab-active-tab',
      JSON.stringify({
        id: 'restored-tab',
        title: '恢复页',
        closable: true,
        refreshable: true,
        iframe: true,
        active: true,
        url: 'javascript:void(0)',
        pages: new Stack([{ id: 'restored-page', tabId: 'restored-tab', path: '/iframe' }])
      })
    )

    panel.initialize([])

    expect(panel.tabs.value.find((tab: ITabItem) => tab.id === 'restored-tab')?.url).toBe(
      'about:blank'
    )

    panel.destroy()
    runtime.cleanup()
  })

  it('从路由 __src 创建 iframe tab 时清洗非法 url', async () => {
    const runtime = await withRuntimeContext()
    const { encodeTabInfo } = await import('@/lib/utils/tabInfoEncoder')
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()
    const route = {
      ...mockRoute('/iframe'),
      query: {
        __tab: encodeTabInfo({ id: 'iframe-tab', title: 'Iframe', iframe: true }),
        __src: encodeURIComponent('javascript:void(0)')
      }
    }

    panel.addPage(route, {} as never)

    expect(panel.tabs.value.find((tab: ITabItem) => tab.id === 'iframe-tab')?.url).toBe(
      'about:blank'
    )

    panel.destroy()
    runtime.cleanup()
  })

  it('从路由 malformed __src 创建 iframe tab 时降级为 about:blank', async () => {
    const runtime = await withRuntimeContext()
    const { encodeTabInfo } = await import('@/lib/utils/tabInfoEncoder')
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()
    const route = {
      ...mockRoute('/iframe'),
      query: {
        __tab: encodeTabInfo({ id: 'iframe-malformed-src', title: 'Iframe', iframe: true }),
        __src: '%E0%A4%A'
      }
    }

    expect(() => panel.addPage(route, {} as never)).not.toThrow()
    expect(panel.tabs.value.find((tab: ITabItem) => tab.id === 'iframe-malformed-src')?.url).toBe(
      'about:blank'
    )

    panel.destroy()
    runtime.cleanup()
  })

  it('renewTab 返回的回滚函数会恢复 pages、cache 与 component', async () => {
    const runtime = await withRuntimeContext()
    const { defineComponent } = await import('vue')
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()
    const component = defineComponent({
      name: 'RenewRollbackComponent',
      setup: () => () => null
    }) as DefineComponent

    panel.initialize([{ id: 'tab-1', title: '第一页', path: '/one' }])
    const page = panel.tabs.value[0]?.pages.peek()
    expect(page).toBeTruthy()
    panel.addComponent(page!.id, component)

    const rollback = panel.renewTab({ id: 'tab-1', title: '第一页', path: '/two' })

    expect(panel.tabs.value[0]?.pages.isEmpty()).toBe(true)
    expect(panel.caches.value).not.toContain(page!.id)
    expect(panel.getComponent(page!.id)).toBeUndefined()

    rollback?.()

    expect(panel.tabs.value[0]?.pages.peek()?.id).toBe(page!.id)
    expect(panel.caches.value).toContain(page!.id)
    expect(panel.getComponent(page!.id)).toBe(component)

    panel.destroy()
    runtime.cleanup()
  })

  it('active 路由导航失败时回滚 active 状态与 session', async () => {
    const runtime = await withRuntimeContext()
    const failure = { type: 'aborted' }
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()

    panel.initialize([
      { id: 'tab-1', title: '第一页', path: '/one' },
      { id: 'tab-2', title: '第二页', path: '/two' }
    ])
    await panel.active('tab-1', false)
    push.mockResolvedValue(failure)

    await expect(panel.active('tab-2')).rejects.toBe(failure)

    expect(panel.tabs.value.find((tab: ITabItem) => tab.id === 'tab-1')?.active).toBe(true)
    expect(panel.tabs.value.find((tab: ITabItem) => tab.id === 'tab-2')?.active).toBe(false)
    expect(window.sessionStorage.getItem('stacktab-active-tab')).toContain('tab-1')

    panel.destroy()
    runtime.cleanup()
  })

  it('addPage 不原地修改 route.query，且 page.query 保存拷贝', async () => {
    const runtime = await withRuntimeContext()
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()
    const route = mockRoute('/external')
    const originalQuery = route.query

    panel.addPage(route, {} as never)

    expect(route.query).toBe(originalQuery)
    expect(route.query.__tab).toBeUndefined()

    const createdTab = panel.tabs.value[0]
    const page = createdTab?.pages.peek()
    expect(page?.query).not.toBe(route.query)
    expect(page?.query?.__tab).toEqual(expect.any(String))

    if (page?.query) {
      page.query.extra = 'internal-only'
    }
    expect(route.query.extra).toBeUndefined()

    panel.destroy()
    runtime.cleanup()
  })

  it('addPage 会浅拷贝 route.query 中的数组值', async () => {
    const runtime = await withRuntimeContext()
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()
    const originalTags = ['a', 'b']
    const route = {
      ...mockRoute('/external'),
      query: {
        tags: originalTags
      }
    }

    panel.addPage(route, {} as never)

    const page = panel.tabs.value[0]?.pages.peek()
    expect(page?.query?.tags).toEqual(['a', 'b'])
    expect(page?.query?.tags).not.toBe(originalTags)

    if (Array.isArray(page?.query?.tags)) {
      page.query.tags.push('internal-only')
    }
    expect(originalTags).toEqual(['a', 'b'])

    panel.destroy()
    runtime.cleanup()
  })

  it('无 __tab 路由刷新后再次 addPage 会复用当前激活 tab 身份', async () => {
    const runtime = await withRuntimeContext()
    const { default: useTabPanel } = await import('@/lib/hooks/useTabPanel')
    const panel = useTabPanel()
    const route = mockRoute('/external')

    panel.addPage(route, {} as never)
    const firstTabId = panel.tabs.value[0]?.id
    const firstPageId = panel.tabs.value[0]?.pages.peek()?.id

    panel.refreshTab(firstTabId!)
    panel.addPage(route, {} as never)

    expect(panel.tabs.value).toHaveLength(1)
    expect(panel.tabs.value[0]?.id).toBe(firstTabId)
    // 活动页刷新不能替换 keep-alive 的缓存身份；外层 refreshKey 负责重建与动画。
    expect(panel.tabs.value[0]?.pages.peek()).toMatchObject({
      id: firstPageId,
      refreshVersion: 1
    })
    expect(panel.refreshKey.value).toBe(0)

    panel.destroy()
    runtime.cleanup()
  })
})
