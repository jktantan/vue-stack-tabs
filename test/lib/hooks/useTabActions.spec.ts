import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeTabInfo } from '@/lib/utils/tabInfoEncoder'

const push = vi.fn()
const active = vi.fn()
const hasTab = vi.fn()
const canAddTab = vi.fn()
const getTab = vi.fn()
const renewTab = vi.fn()
const refreshKey = { value: 0 }
const tabs = { value: [] }
const pages = { list: vi.fn(), clear: vi.fn(), push: vi.fn() }
const rollbackRenew = vi.fn()
const runtimeContext = {
  iframePath: { value: '/iframe' }
}

vi.mock('throttle-debounce', () => ({
  throttle: (_delay: number, fn: (...args: unknown[]) => unknown) => fn
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  isNavigationFailure: (value: unknown) =>
    typeof value === 'object' && value !== null && 'type' in value
}))

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    active,
    hasTab,
    refreshKey,
    reset: vi.fn(),
    canAddTab,
    renewTab,
    getTab,
    tabs,
    removeTab: vi.fn(),
    removeAllTabs: vi.fn(),
    refreshTab: vi.fn(),
    refreshAllTabs: vi.fn()
  })
}))

vi.mock('@/lib/hooks/stackTabsContext', () => ({
  resolveStackTabsRuntimeContext: () => runtimeContext
}))

describe('useTabActions', () => {
  beforeEach(() => {
    vi.resetModules()
    push.mockReset()
    active.mockReset()
    hasTab.mockReset()
    canAddTab.mockReset()
    getTab.mockReset()
    renewTab.mockReset()
    pages.list.mockReset()
    pages.clear.mockReset()
    pages.push.mockReset()
    rollbackRenew.mockReset()
    runtimeContext.iframePath.value = '/iframe'
    refreshKey.value = 0
    push.mockResolvedValue(undefined)
    canAddTab.mockReturnValue(true)
    hasTab.mockReturnValue(false)
  })

  it('打开已存在标签时等待激活导航，NavigationFailure 应 reject', async () => {
    const failure = { type: 'aborted' }
    hasTab.mockReturnValue(true)
    active.mockRejectedValue(failure)

    const { default: useTabActions } = await import('@/lib/hooks/useTabActions')
    const { openTab } = useTabActions()

    await expect(openTab({ id: 'tab-1', title: '已存在', path: '/exists' })).rejects.toBe(failure)
    expect(active).toHaveBeenCalledWith('tab-1')
  })

  it('openTab 忽略 path query 与 tab.query 中的保留 __tab，始终使用内部编码', async () => {
    const { default: useTabActions } = await import('@/lib/hooks/useTabActions')
    const { openTab } = useTabActions()

    await expect(
      openTab({
        id: 'safe-tab',
        title: 'Safe',
        path: '/orders?__tab=attacker&foo=1',
        query: {
          __tab: 'attacker-2',
          bar: '2'
        }
      })
    ).resolves.toBe('safe-tab')

    expect(push).toHaveBeenCalledTimes(1)
    const route = push.mock.calls[0]?.[0]
    expect(route).toMatchObject({ path: '/orders' })
    expect(route.query.foo).toBe('1')
    expect(route.query.bar).toBe('2')
    expect(route.query.__tab).not.toBe('attacker')
    expect(route.query.__tab).not.toBe('attacker-2')
    expect(decodeTabInfo(String(route.query.__tab))).toMatchObject({
      id: 'safe-tab',
      title: 'Safe'
    })
  })

  it('openTab 遇到非法 tab URL 时 reject 且不调用 router.push', async () => {
    const { default: useTabActions } = await import('@/lib/hooks/useTabActions')
    const { openTab } = useTabActions()

    await expect(
      openTab({ id: 'bad-tab', title: 'Bad', path: 'javascript:void(0)' })
    ).rejects.toThrow('Invalid tab URL')

    expect(push).not.toHaveBeenCalled()
  })

  it('打开新标签时 router.push resolve NavigationFailure 应 reject', async () => {
    const failure = { type: 'aborted' }
    push.mockResolvedValue(failure)

    const { default: useTabActions } = await import('@/lib/hooks/useTabActions')
    const { openTab } = useTabActions()

    await expect(openTab({ id: 'new-tab', title: '新标签', path: '/new' })).rejects.toBe(failure)
  })

  it('renew 已存在标签时不受最大数量限制', async () => {
    hasTab.mockReturnValue(true)
    canAddTab.mockReturnValue(false)
    getTab.mockReturnValue({ id: 'tab-1', active: false })

    const { default: useTabActions } = await import('@/lib/hooks/useTabActions')
    const { openTab } = useTabActions()

    await expect(openTab({ id: 'tab-1', title: '续签', path: '/renew' }, true)).resolves.toBe(
      'tab-1'
    )

    expect(renewTab).toHaveBeenCalledWith({ id: 'tab-1', title: '续签', path: '/renew' })
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('renew 已存在且激活标签导航失败时回滚 refreshKey', async () => {
    const failure = { type: 'aborted' }
    const currentTab = { id: 'tab-1', active: true, pages }
    hasTab.mockReturnValue(true)
    getTab.mockReturnValue(currentTab)
    renewTab.mockReturnValue(rollbackRenew)
    refreshKey.value = 7
    push.mockResolvedValue(failure)

    const { default: useTabActions } = await import('@/lib/hooks/useTabActions')
    const { openTab } = useTabActions()

    await expect(openTab({ id: 'tab-1', title: '续签', path: '/renew' }, true)).rejects.toBe(
      failure
    )

    expect(rollbackRenew).toHaveBeenCalledTimes(1)
    expect(refreshKey.value).toBe(7)
  })

  it('setIFramePath 写入 runtime context，iframe tab 使用 context 中的占位路由', async () => {
    const { default: useTabActions } = await import('@/lib/hooks/useTabActions')
    const { openTab, setIFramePath } = useTabActions()

    setIFramePath('/frame-host')

    expect(runtimeContext.iframePath.value).toBe('/frame-host')

    await expect(
      openTab({ id: 'iframe-tab', title: 'Iframe', path: 'https://example.com/page', iframe: true })
    ).resolves.toBe('iframe-tab')

    expect(push).toHaveBeenCalledTimes(1)
    const route = push.mock.calls[0]?.[0]
    expect(route.path).toBe('/frame-host')
    expect(route.query.__src).toBe(encodeURIComponent('https://example.com/page'))
  })

  it('openTab 不原地修改传入的 tab.query', async () => {
    const originalQuery = {
      bar: '2'
    }
    const { default: useTabActions } = await import('@/lib/hooks/useTabActions')
    const { openTab } = useTabActions()

    await expect(
      openTab({
        id: 'immutable-tab',
        title: 'Immutable',
        path: '/immutable?foo=1',
        query: originalQuery
      })
    ).resolves.toBe('immutable-tab')

    expect(originalQuery).toEqual({ bar: '2' })
    const route = push.mock.calls[0]?.[0]
    expect(route.query).not.toBe(originalQuery)
    expect(route.query.foo).toBe('1')
    expect(route.query.bar).toBe('2')
    expect(route.query.__tab).toEqual(expect.any(String))
  })
})
