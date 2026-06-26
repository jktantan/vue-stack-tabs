import { describe, expect, it } from 'vitest'
import { TabEventType } from './useTabEventBus'

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
