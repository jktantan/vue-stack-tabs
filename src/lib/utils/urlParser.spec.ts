import { describe, it, expect } from 'vitest'
import { parseUrl, isCrossOriginUrl, isInvalidIframeUrl } from './urlParser'

describe('isInvalidIframeUrl', () => {
  it('javascript: 和 data: 协议返回 true', () => {
    expect(isInvalidIframeUrl('javascript:void(0)')).toBe(true)
    expect(isInvalidIframeUrl('data:text/html,test')).toBe(true)
  })
  it('http/https 或相对路径返回 false', () => {
    expect(isInvalidIframeUrl('http://example.com')).toBe(false)
    expect(isInvalidIframeUrl('/path')).toBe(false)
    expect(isInvalidIframeUrl('')).toBe(false)
  })
})

describe('isCrossOriginUrl', () => {
  it('相对路径返回 false', () => {
    expect(isCrossOriginUrl('/demo')).toBe(false)
  })
  it('空或非 http(s) 返回 false', () => {
    expect(isCrossOriginUrl('')).toBe(false)
    expect(isCrossOriginUrl('javascript:void(0)')).toBe(false)
  })
})

describe('parseUrl', () => {
  it('解析纯 path', () => {
    expect(parseUrl('/dashboard')).toEqual({ path: '/dashboard', query: {} })
  })

  it('解析 path 带 query', () => {
    expect(parseUrl('/page?a=1&b=2')).toEqual({
      path: '/page',
      query: { a: '1', b: '2' }
    })
  })

  it('解析单个 query 参数', () => {
    expect(parseUrl('/x?id=123')).toEqual({ path: '/x', query: { id: '123' } })
  })

  it('空 query 或空 value 不加入结果', () => {
    expect(parseUrl('/p?key=')).toEqual({ path: '/p', query: {} })
  })
})
