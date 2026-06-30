import { beforeEach, describe, expect, it } from 'vitest'
import {
  createStackTabsRuntimeContext,
  getActiveStackTabsRuntimeContext,
  registerStackTabsRuntimeContext,
  unregisterStackTabsRuntimeContext
} from './stackTabsContext'
import { TabEventType, useTabEmitter } from './useTabEventBus'

describe('TabEventType', () => {
  it('包含已有页面加载和页签激活事件名', () => {
    expect(TabEventType.PAGE_LOADING).toBe('PAGE_LOADING')
    expect(TabEventType.TAB_ACTIVE).toBe('TAB_ACTIVE')
  })

  it('包含 StackTabs 和 useTabRouter 已有的路由切换事件名', () => {
    expect(TabEventType.FORWARD).toBe('FORWARD')
    expect(TabEventType.BACKWARD).toBe('BACKWARD')
  })

  it('包含 iframe postMessage 刷新事件名且保持文本兼容', () => {
    expect(TabEventType.REFRESH_IFRAME_POSTMESSAGE).toBe('REFRESH_IFRAME_POSTMESSAGE')
  })
})

describe('useTabEmitter', () => {
  beforeEach(() => {
    const active = getActiveStackTabsRuntimeContext()
    if (active) unregisterStackTabsRuntimeContext(active)
  })

  it('从已注册 runtime context 返回同一个 typed emitter', () => {
    const context = createStackTabsRuntimeContext()
    const received: string[] = []

    registerStackTabsRuntimeContext(context, { isProduction: false })
    context.eventBus.on(TabEventType.TAB_ACTIVE, (payload) => received.push(payload.id))

    useTabEmitter().emit(TabEventType.TAB_ACTIVE, { id: 'tab-1' })

    expect(received).toEqual(['tab-1'])
  })

  it('未注册 runtime context 时抛出清晰错误', () => {
    expect(() => useTabEmitter()).toThrow(
      'VueStackTabs runtime context is not available. Render <VueStackTabs> before using vue-stack-tabs composables.'
    )
  })
})
