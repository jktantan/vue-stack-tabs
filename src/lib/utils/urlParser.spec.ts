import { describe, expect, it } from 'vitest'
import {
  decodeSafeTabUrl,
  isAllowedTabUrl,
  isInvalidIframeUrl,
  parseUrl,
  toSafeTabUrl
} from './urlParser'

describe('tab URL allowlist', () => {
  it('允许相对路径、http、https 和 about:blank', () => {
    expect(isAllowedTabUrl('/dashboard')).toBe(true)
    expect(isAllowedTabUrl('settings/profile')).toBe(true)
    expect(isAllowedTabUrl('https://example.com/app')).toBe(true)
    expect(isAllowedTabUrl('http://example.com/app')).toBe(true)
    expect(isAllowedTabUrl('about:blank')).toBe(true)
  })

  it('拒绝非 http(s) scheme，避免进入 iframe/window.open 等 URL sink', () => {
    expect(isAllowedTabUrl('javascript:void(0)')).toBe(false)
    expect(isAllowedTabUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isAllowedTabUrl('vbscript:msgbox(1)')).toBe(false)
    expect(isAllowedTabUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedTabUrl('mailto:test@example.com')).toBe(false)
  })

  it('拒绝带控制字符混淆的危险 scheme', () => {
    expect(isAllowedTabUrl('java\nscript:void(0)')).toBe(false)
    expect(isAllowedTabUrl('java\tscript:void(0)')).toBe(false)
    expect(isAllowedTabUrl('data\r:text/html,test')).toBe(false)
    expect(toSafeTabUrl('java\nscript:void(0)')).toBe('about:blank')
  })

  it('拒绝不可见或 bidi 控制字符混淆的危险 scheme', () => {
    expect(isAllowedTabUrl('java​script:void(0)')).toBe(false)
    expect(isAllowedTabUrl('​javascript:void(0)')).toBe(false)
    expect(isAllowedTabUrl('java‮script:void(0)')).toBe(false)
    expect(toSafeTabUrl('java​script:void(0)')).toBe('about:blank')
  })

  it('只允许精确 about:blank', () => {
    expect(isAllowedTabUrl('about:blank')).toBe(true)
    expect(isAllowedTabUrl('about:blank#payload')).toBe(false)
    expect(isAllowedTabUrl('about:srcdoc')).toBe(false)
  })

  it('isInvalidIframeUrl 与 allowlist 保持一致，非法 URL 返回 true', () => {
    expect(isInvalidIframeUrl('javascript:void(0)')).toBe(true)
    expect(isInvalidIframeUrl('data:text/html,test')).toBe(true)
    expect(isInvalidIframeUrl('file:///etc/passwd')).toBe(true)
    expect(isInvalidIframeUrl('/path')).toBe(false)
    expect(isInvalidIframeUrl('https://example.com')).toBe(false)
  })

  it('toSafeTabUrl 对非法 URL 返回 about:blank', () => {
    expect(toSafeTabUrl('javascript:void(0)')).toBe('about:blank')
    expect(toSafeTabUrl('file:///etc/passwd')).toBe('about:blank')
    expect(toSafeTabUrl('/safe')).toBe('/safe')
  })
})

describe('decodeSafeTabUrl', () => {
  it('解码合法 URL 并对非法或 malformed 编码降级', () => {
    expect(decodeSafeTabUrl(encodeURIComponent('/safe path'))).toBe('/safe path')
    expect(decodeSafeTabUrl(encodeURIComponent('javascript:void(0)'))).toBe('about:blank')
    expect(decodeSafeTabUrl('%E0%A4%A')).toBe('about:blank')
    expect(decodeSafeTabUrl(['%2Fsafe'])).toBe('about:blank')
  })
})

describe('isCrossOriginUrl', () => {
  it('相对路径返回 false', async () => {
    const { isCrossOriginUrl } = await import('./urlParser')
    expect(isCrossOriginUrl('/demo')).toBe(false)
  })

  it('空或非 http(s) 返回 false', async () => {
    const { isCrossOriginUrl } = await import('./urlParser')
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

  it('保留空 query value，避免丢失 Vue Router query 语义', () => {
    expect(parseUrl('/p?key=')).toEqual({ path: '/p', query: { key: '' } })
  })
})
