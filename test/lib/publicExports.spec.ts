/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import {
  resolveTabPageContext,
  tabPageContextKey,
  useTabScrollShadow,
  type TabPageContext,
  type TabScrollShadowState
} from '@/lib/index'

describe('public exports - tab page context', () => {
  it('导出页面上下文 key 与解析函数，供宿主的非页面组件 inject', () => {
    // 例：宿主自定义 scrollContainer 需要 tabId / pageId，但本身不在页面组件内。
    expect(typeof tabPageContextKey).toBe('symbol')
    expect(typeof resolveTabPageContext).toBe('function')
  })

  it('TabPageContext 类型包含 tabId / pageId', () => {
    const context: TabPageContext = { tabId: 'tab', pageId: 'page' }

    expect(context).toEqual({ tabId: 'tab', pageId: 'page' })
  })

  it('导出 useTabScrollShadow 与阴影状态类型', () => {
    expect(typeof useTabScrollShadow).toBe('function')

    const state: TabScrollShadowState = 'both'
    expect(state).toBe('both')
  })
})
