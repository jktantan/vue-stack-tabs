import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE,
  STACK_TABS_DUPLICATE_INSTANCE_MESSAGE,
  createStackTabsRuntimeContext,
  getActiveStackTabsRuntimeContext,
  registerStackTabsRuntimeContext,
  resolveStackTabsRuntimeContext,
  unregisterStackTabsRuntimeContext
} from '@/lib/hooks/stackTabsContext'

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

describe('stackTabsContext', () => {
  beforeEach(() => {
    warnSpy.mockClear()
    const active = getActiveStackTabsRuntimeContext()
    if (active) unregisterStackTabsRuntimeContext(active)
  })

  it('createStackTabsRuntimeContext 创建完整的空运行时状态', () => {
    const context = createStackTabsRuntimeContext({
      iframePath: '/iframe',
      maxTabCount: 20,
      useGlobalScroll: true,
      sessionPrefix: 'admin:'
    })

    expect(context.tabs.value).toEqual([])
    expect(context.defaultTabs.value).toEqual([])
    expect(context.caches.value).toEqual([])
    expect(context.components.size).toBe(0)
    expect(context.cacheIdsToEvict.size).toBe(0)
    expect(context.tabIdsToEvict.size).toBe(0)
    expect(context.refreshKey.value).toBe(0)
    expect(context.scrollPositionsByPageId.size).toBe(0)
    expect(context.isInitialized.value).toBe(false)
    expect(context.iframeRefreshKeys.value).toEqual({})
    expect(context.maxTabCount.value).toBe(20)
    expect(context.useGlobalScroll.value).toBe(true)
    expect(context.sessionPrefix.value).toBe('admin:')
    expect(context.iframePath.value).toBe('/iframe')
    expect(typeof context.eventBus.emit).toBe('function')
  })

  it('resolveStackTabsRuntimeContext 在没有注册实例时抛出清晰错误', () => {
    expect(() => resolveStackTabsRuntimeContext()).toThrow(STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE)
  })

  it('开发环境重复注册实例时抛错且保留第一个 context', () => {
    const first = createStackTabsRuntimeContext({ iframePath: '/first' })
    const second = createStackTabsRuntimeContext({ iframePath: '/second' })

    expect(registerStackTabsRuntimeContext(first, { isProduction: false })).toBe(true)
    expect(() => registerStackTabsRuntimeContext(second, { isProduction: false })).toThrow(
      STACK_TABS_DUPLICATE_INSTANCE_MESSAGE
    )
    expect(resolveStackTabsRuntimeContext()).toBe(first)
  })

  it('生产环境重复注册实例时 warn 且不覆盖第一个 context', () => {
    const first = createStackTabsRuntimeContext({ iframePath: '/first' })
    const second = createStackTabsRuntimeContext({ iframePath: '/second' })

    expect(registerStackTabsRuntimeContext(first, { isProduction: true })).toBe(true)
    expect(registerStackTabsRuntimeContext(second, { isProduction: true })).toBe(false)

    expect(warnSpy).toHaveBeenCalledWith(STACK_TABS_DUPLICATE_INSTANCE_MESSAGE)
    expect(resolveStackTabsRuntimeContext()).toBe(first)
    expect(resolveStackTabsRuntimeContext().iframePath.value).toBe('/first')
  })

  it('注销当前 context 后 resolver 回到不可用状态', () => {
    const context = createStackTabsRuntimeContext()

    registerStackTabsRuntimeContext(context, { isProduction: false })
    unregisterStackTabsRuntimeContext(context)

    expect(getActiveStackTabsRuntimeContext()).toBeNull()
    expect(() => resolveStackTabsRuntimeContext()).toThrow(STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE)
  })
})
