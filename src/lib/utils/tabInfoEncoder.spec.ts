import { describe, it, expect } from 'vitest'
import { encodeTabInfo, decodeTabInfo, createPageId } from './tabInfoEncoder'
import type { ITabBase } from '../model/TabModel'

describe('tabInfoEncoder', () => {
  const tabData: ITabBase = {
    id: 'tab-1',
    title: '测试',
    iframe: false,
    closable: true,
    refreshable: true
  }

  it('encodeTabInfo 与 decodeTabInfo 往返一致', () => {
    const encoded = encodeTabInfo(tabData)
    expect(encoded).toBeTruthy()
    const decoded = decodeTabInfo(encoded)
    expect(decoded.id).toBe(tabData.id)
    expect(decoded.title).toBe(tabData.title)
    expect(decoded.iframe).toBe(false)
    expect(decoded.closable).toBe(true)
    expect(decoded.refreshable).toBe(true)
  })

  it('createPageId 相同输入产生相同输出', () => {
    const id1 = createPageId('t1', '/path', { a: '1', b: '2' })
    const id2 = createPageId('t1', '/path', { b: '2', a: '1' })
    expect(id1).toBe(id2)
  })

  it('createPageId 不同 tabId 产生不同输出', () => {
    const id1 = createPageId('t1', '/path', {})
    const id2 = createPageId('t2', '/path', {})
    expect(id1).not.toBe(id2)
  })

  it('createPageId 排除 __ 前缀的 query', () => {
    const withTab = createPageId('t1', '/path', { __tab: 'x', a: '1' })
    const withoutTab = createPageId('t1', '/path', { a: '1' })
    expect(withTab).toBe(withoutTab)
  })
})
