import { describe, it, expect, beforeEach } from 'vitest'
import {
  markCacheForEviction,
  markTabPagesForEviction,
  markTabPagesForEvictionOnly,
  addCache,
  removeCache,
  evictPageCache,
  evictMarkedCaches
} from './evict'
import { caches, cacheIdsToEvict, tabIdsToEvict, components } from './state'
import { Stack } from '../../model/TabModel'
import type { ITabPage } from '../../model/TabModel'

function resetState() {
  caches.value = []
  cacheIdsToEvict.clear()
  tabIdsToEvict.clear()
  components.clear()
}

beforeEach(resetState)

describe('evict', () => {
  it('addCache 添加缓存 id', () => {
    addCache('c1')
    expect(caches.value).toContain('c1')
    addCache('c1')
    expect(caches.value.filter((x) => x === 'c1')).toHaveLength(1)
  })

  it('removeCache 移除指定 id', () => {
    addCache('c1')
    removeCache('c1')
    expect(caches.value).not.toContain('c1')
  })

  it('markCacheForEviction 标记待驱逐', () => {
    markCacheForEviction('c1')
    expect(cacheIdsToEvict.has('c1')).toBe(true)
  })

  it('markTabPagesForEviction 标记标签下所有页面并加入 tabIdsToEvict', () => {
    const page: ITabPage = { id: 'p1', tabId: 't1', path: '/x' }
    const stack = new Stack<ITabPage>()
    stack.push(page)
    const tab = { id: 't1', pages: { list: () => stack.list() } }
    markTabPagesForEviction(tab)
    expect(cacheIdsToEvict.has('p1')).toBe(true)
    expect(tabIdsToEvict.has('t1')).toBe(true)
  })

  it('markTabPagesForEvictionOnly 只标记页面不标记 tab', () => {
    const page: ITabPage = { id: 'p1', tabId: 't1', path: '/x' }
    const stack = new Stack<ITabPage>()
    stack.push(page)
    const tab = { pages: { list: () => stack.list() } }
    markTabPagesForEvictionOnly(tab)
    expect(cacheIdsToEvict.has('p1')).toBe(true)
    expect(tabIdsToEvict.size).toBe(0)
  })

  it('evictPageCache 立即驱逐单个缓存', () => {
    addCache('c1')
    components.set('c1', {} as never)
    evictPageCache('c1')
    expect(caches.value).not.toContain('c1')
    expect(components.has('c1')).toBe(false)
    expect(cacheIdsToEvict.has('c1')).toBe(false)
  })

  it('evictMarkedCaches 执行所有待驱逐', () => {
    addCache('c1')
    addCache('c2')
    components.set('c1', {} as never)
    components.set('c2', {} as never)
    markCacheForEviction('c1')
    markCacheForEviction('c2')
    evictMarkedCaches()
    expect(caches.value).not.toContain('c1')
    expect(caches.value).not.toContain('c2')
    expect(components.size).toBe(0)
    expect(cacheIdsToEvict.size).toBe(0)
  })
})
