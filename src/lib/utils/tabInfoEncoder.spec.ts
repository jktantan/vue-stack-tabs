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

  it('createPageId 每次生成唯一 ULID', () => {
    const id1 = createPageId()
    const id2 = createPageId()
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })
})
