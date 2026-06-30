import { describe, it, expect } from 'vitest'
import { encodeTabInfo, decodeTabInfo, createPageId } from '@/lib/utils/tabInfoEncoder'
import type { ITabBase } from '@/lib/model/TabModel'

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

  it('标题包含分隔符时仍能保持完整，避免 __tab 协议解码错位', () => {
    const tabWithDelimiter: ITabBase = {
      id: 'tab-delimiter',
      title: '订单|详情|A',
      iframe: true,
      closable: true,
      refreshable: false,
      iframeRefreshMode: 'reload'
    }

    const decoded = decodeTabInfo(encodeTabInfo(tabWithDelimiter))

    expect(decoded).toEqual(tabWithDelimiter)
  })

  it('兼容旧版分隔符编码的 __tab 参数', () => {
    const legacyInfo = 'legacy-id|旧标题|Y|N|Y|R'
    const encoded = encodeURIComponent(btoa(encodeURIComponent(legacyInfo)))

    expect(decodeTabInfo(encoded)).toEqual({
      id: 'legacy-id',
      title: '旧标题',
      iframe: true,
      closable: false,
      refreshable: true,
      iframeRefreshMode: 'reload'
    })
  })

  it('非法 JSON 格式的 __tab 不会让解码抛错', () => {
    const encoded = encodeURIComponent(btoa(encodeURIComponent('{invalid-json')))

    expect(() => decodeTabInfo(encoded)).not.toThrow()
    expect(decodeTabInfo(encoded)).toMatchObject({
      title: '',
      iframe: false,
      closable: true,
      refreshable: true,
      iframeRefreshMode: 'postMessage'
    })
  })

  it('JSON 结构不符合协议时返回安全默认 tab 信息', () => {
    const encoded = encodeURIComponent(btoa(encodeURIComponent(JSON.stringify({ version: 1 }))))

    expect(decodeTabInfo(encoded)).toMatchObject({
      title: '',
      iframe: false,
      closable: true,
      refreshable: true,
      iframeRefreshMode: 'postMessage'
    })
  })

  it('超大 __tab payload 返回安全默认值，避免在路由渲染路径造成 DoS', () => {
    const encoded = encodeURIComponent(
      btoa(
        encodeURIComponent(
          JSON.stringify({
            version: 1,
            title: 'x'.repeat(5000)
          })
        )
      )
    )

    expect(decodeTabInfo(encoded)).toMatchObject({
      title: '',
      iframe: false,
      closable: true,
      refreshable: true,
      iframeRefreshMode: 'postMessage'
    })
  })

  it('encoded __tab 超过上限时在解码前返回安全默认值', () => {
    const encoded = 'x'.repeat(5000)

    expect(decodeTabInfo(encoded)).toMatchObject({
      title: '',
      iframe: false,
      closable: true,
      refreshable: true,
      iframeRefreshMode: 'postMessage'
    })
  })

  it('createPageId 每次生成唯一 ULID', () => {
    const id1 = createPageId()
    const id2 = createPageId()
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })
})
