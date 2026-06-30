import { describe, expect, it } from 'vitest'
import { getPostMessageTargetOrigin, isStackTabsOpenTabMessage } from '@/lib/utils/stackTabsMessage'

describe('stackTabsMessage', () => {
  const source = { marker: 'managed-frame' } as unknown as MessageEventSource
  const otherSource = { marker: 'other-frame' } as unknown as MessageEventSource
  const isManagedSource = (candidate: MessageEventSource | null) => candidate === source

  it('只接受受控 iframe source 发来的合法 openTab payload', () => {
    const result = isStackTabsOpenTabMessage(
      {
        source,
        data: {
          type: 'vue-stack-tabs:openTab',
          payload: {
            title: '详情',
            path: '/orders/1',
            iframe: false
          }
        }
      } as MessageEvent,
      isManagedSource
    )

    expect(result).toEqual({
      title: '详情',
      path: '/orders/1',
      iframe: false
    })
  })

  it('兼容旧 openTab type，但仍要求受控 source 和合法 URL', () => {
    const result = isStackTabsOpenTabMessage(
      {
        source,
        data: {
          type: 'openTab',
          payload: {
            title: '旧格式',
            path: 'https://example.com/legacy',
            iframe: true
          }
        }
      } as MessageEvent,
      isManagedSource
    )

    expect(result?.path).toBe('https://example.com/legacy')
  })

  it('保留 Vue Router 合法 query 形态', () => {
    const result = isStackTabsOpenTabMessage(
      {
        source,
        data: {
          type: 'vue-stack-tabs:openTab',
          payload: {
            title: '带 query',
            path: '/orders',
            query: {
              keyword: 'book',
              tags: ['a', 'b'],
              page: 2,
              empty: null,
              missing: undefined
            }
          }
        }
      } as MessageEvent,
      isManagedSource
    )

    expect(result?.query).toEqual({
      keyword: 'book',
      tags: ['a', 'b'],
      page: 2,
      empty: null,
      missing: undefined
    })
  })

  it('忽略顶层数组 query，避免把数组索引误当成 query key', () => {
    const result = isStackTabsOpenTabMessage(
      {
        source,
        data: {
          type: 'vue-stack-tabs:openTab',
          payload: {
            title: '数组 query',
            path: '/orders',
            query: ['a', 'b']
          }
        }
      } as MessageEvent,
      isManagedSource
    )

    expect(result?.query).toBeUndefined()
  })

  it('拒绝非受控窗口来源', () => {
    const result = isStackTabsOpenTabMessage(
      {
        source: otherSource,
        data: {
          type: 'vue-stack-tabs:openTab',
          payload: { title: '详情', path: '/orders/1' }
        }
      } as MessageEvent,
      isManagedSource
    )

    expect(result).toBeNull()
  })

  it('拒绝非法 URL payload', () => {
    const result = isStackTabsOpenTabMessage(
      {
        source,
        data: {
          type: 'vue-stack-tabs:openTab',
          payload: {
            title: '恶意',
            path: 'javascript:void(0)'
          }
        }
      } as MessageEvent,
      isManagedSource
    )

    expect(result).toBeNull()
  })

  it('拒绝缺少 title、path 或 path 为空的 payload', () => {
    expect(
      isStackTabsOpenTabMessage(
        {
          source,
          data: {
            type: 'vue-stack-tabs:openTab',
            payload: { title: '缺 path' }
          }
        } as MessageEvent,
        isManagedSource
      )
    ).toBeNull()

    expect(
      isStackTabsOpenTabMessage(
        {
          source,
          data: {
            type: 'vue-stack-tabs:openTab',
            payload: { path: '/missing-title' }
          }
        } as MessageEvent,
        isManagedSource
      )
    ).toBeNull()

    expect(
      isStackTabsOpenTabMessage(
        {
          source,
          data: {
            type: 'vue-stack-tabs:openTab',
            payload: { title: '空 path', path: '   ' }
          }
        } as MessageEvent,
        isManagedSource
      )
    ).toBeNull()
  })
})

describe('getPostMessageTargetOrigin', () => {
  it('对 http(s) iframe URL 返回精确 origin', () => {
    expect(getPostMessageTargetOrigin('https://example.com/path?x=1')).toBe('https://example.com')
    expect(getPostMessageTargetOrigin('http://example.com/path')).toBe('http://example.com')
  })

  it('对相对路径返回当前页面 origin', () => {
    expect(getPostMessageTargetOrigin('/internal', 'https://app.example.com')).toBe(
      'https://app.example.com'
    )
  })

  it('对非法或空 URL 返回 null，避免 wildcard targetOrigin', () => {
    expect(getPostMessageTargetOrigin('javascript:void(0)', 'https://app.example.com')).toBeNull()
    expect(getPostMessageTargetOrigin('', 'https://app.example.com')).toBeNull()
  })
})
