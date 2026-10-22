import { describe, it, expect, vi } from 'vitest'
import { encodeTabInfo, decodeTabInfo, createPageId, createId } from '@/lib/utils/tabInfoEncoder'
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
    // 使用与 decodeBase64 对称的编码方式构造：btoa(unescape(encodeURIComponent(...)))。
    const encoded = btoa(unescape(encodeURIComponent(legacyInfo)))

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
    const encoded = btoa(unescape(encodeURIComponent('{invalid-json')))

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

  it('同一 __tab 重复解码返回内容相等的独立对象', () => {
    const encoded = encodeTabInfo(tabData)
    const first = decodeTabInfo(encoded)
    first.title = 'mutated'
    first.closable = false

    const second = decodeTabInfo(encoded)
    expect(second).toMatchObject({ id: 'tab-1', title: '测试', closable: true })
    expect(second).not.toBe(first)
  })

  it('createPageId 每次生成唯一 id', () => {
    const id1 = createPageId()
    const id2 = createPageId()
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })

  it('编码结果使用 URL-safe 字符且不含 base64 填充', () => {
    const encoded = encodeTabInfo({
      id: 'id/with+special=',
      title: '中文/标题+?',
      iframe: false,
      closable: true,
      refreshable: true
    })

    expect(encoded).not.toMatch(/[+/=]/)
    expect(decodeTabInfo(encoded)).toMatchObject({ id: 'id/with+special=', title: '中文/标题+?' })
  })

  it('非法 legacy __tab 不再伪造出任意标签 id', () => {
    expect(decodeTabInfo(btoa('invalid'))).toMatchObject({ id: '', title: '' })
  })

  it('legacy 字段标记不合法时返回默认值', () => {
    const toLegacy = (value: string) => btoa(unescape(encodeURIComponent(value)))
    expect(decodeTabInfo(toLegacy('legacy-id|标题|X|Y|Y'))).toMatchObject({ id: '', title: '' })
    expect(decodeTabInfo(toLegacy('legacy-id|标题|Y|Y'))).toMatchObject({ id: '', title: '' })
  })

  it('标题超长时截断，避免 __tab 超出解码上限导致 id 丢失', () => {
    const decoded = decodeTabInfo(encodeTabInfo({ id: 'tab-1', title: 'x'.repeat(1000) }))
    expect(decoded.id).toBe('tab-1')
    expect(decoded.title.length).toBe(256)
  })

  it('crypto.randomUUID 不存在时 createId 回退为 UUID v4 格式', () => {
    const originalCrypto = globalThis.crypto
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        for (let index = 0; index < bytes.length; index++) bytes[index] = index
        return bytes
      }
    })
    try {
      expect(createId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      )
    } finally {
      vi.stubGlobal('crypto', originalCrypto)
    }
  })
})
