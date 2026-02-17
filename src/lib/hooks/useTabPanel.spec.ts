import { describe, it, expect } from 'vitest'
import { normalizePathForCache } from './useTabPanel'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

function mockRoute(path: string, matchedPath?: string): RouteLocationNormalizedLoaded {
  return {
    path,
    matched: [{ path: matchedPath ?? path }] as RouteLocationNormalizedLoaded['matched'],
    query: {},
    params: {},
    hash: '',
    fullPath: path,
    name: undefined,
    meta: {},
    redirectedFrom: undefined
  }
}

describe('normalizePathForCache', () => {
  it('当 matched.path 无尾斜杠且 route.path 有尾斜杠时，返回规范化 path', () => {
    const r = mockRoute('/dashboard/', '/dashboard')
    expect(normalizePathForCache(r)).toBe('/dashboard')
  })

  it('路径与 matched 一致时返回规范化 path', () => {
    const r = mockRoute('/home', '/home')
    expect(normalizePathForCache(r)).toBe('/home')
  })

  it('路径与 matched 不一致时返回原 path', () => {
    const r = mockRoute('/detail/1', '/detail/:id')
    expect(normalizePathForCache(r)).toBe('/detail/1')
  })
})
