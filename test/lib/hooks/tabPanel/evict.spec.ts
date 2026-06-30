import { beforeEach, describe, expect, it } from 'vitest'
import type { StackTabsRuntimeContext } from '@/lib/hooks/stackTabsContext'
import { createStackTabsRuntimeContext } from '@/lib/hooks/stackTabsContext'
import { createTabPanelEviction } from '@/lib/hooks/tabPanel/evict'
import { Stack } from '@/lib/model/TabModel'
import type { ITabPage } from '@/lib/model/TabModel'

let context: StackTabsRuntimeContext
let eviction: ReturnType<typeof createTabPanelEviction>

beforeEach(() => {
  context = createStackTabsRuntimeContext()
  eviction = createTabPanelEviction(context)
})

describe('evict', () => {
  it('addCache 添加缓存 id', () => {
    eviction.addCache('c1')
    expect(context.caches.value).toContain('c1')
    eviction.addCache('c1')
    expect(context.caches.value.filter((cacheId) => cacheId === 'c1')).toHaveLength(1)
  })

  it('removeCache 移除指定 id', () => {
    eviction.addCache('c1')
    eviction.removeCache('c1')
    expect(context.caches.value).not.toContain('c1')
  })

  it('markCacheForEviction 标记待驱逐', () => {
    eviction.markCacheForEviction('c1')
    expect(context.cacheIdsToEvict.has('c1')).toBe(true)
  })

  it('markTabPagesForEviction 标记标签下所有页面并加入 tabIdsToEvict', () => {
    const page: ITabPage = { id: 'p1', tabId: 't1', path: '/x' }
    const stack = new Stack<ITabPage>()
    stack.push(page)
    const tab = { id: 't1', pages: { list: () => stack.list() } }
    eviction.markTabPagesForEviction(tab)
    expect(context.cacheIdsToEvict.has('p1')).toBe(true)
    expect(context.tabIdsToEvict.has('t1')).toBe(true)
  })

  it('markTabPagesForEvictionOnly 只标记页面不标记 tab', () => {
    const page: ITabPage = { id: 'p1', tabId: 't1', path: '/x' }
    const stack = new Stack<ITabPage>()
    stack.push(page)
    const tab = { pages: { list: () => stack.list() } }
    eviction.markTabPagesForEvictionOnly(tab)
    expect(context.cacheIdsToEvict.has('p1')).toBe(true)
    expect(context.tabIdsToEvict.size).toBe(0)
  })

  it('evictPageCache 立即驱逐单个缓存', () => {
    eviction.addCache('c1')
    context.components.set('c1', {} as never)
    eviction.evictPageCache('c1')
    expect(context.caches.value).not.toContain('c1')
    expect(context.components.has('c1')).toBe(false)
    expect(context.cacheIdsToEvict.has('c1')).toBe(false)
  })

  it('evictMarkedCaches 执行所有待驱逐', () => {
    eviction.addCache('c1')
    eviction.addCache('c2')
    context.components.set('c1', {} as never)
    context.components.set('c2', {} as never)
    eviction.markCacheForEviction('c1')
    eviction.markCacheForEviction('c2')
    eviction.evictMarkedCaches()
    expect(context.caches.value).not.toContain('c1')
    expect(context.caches.value).not.toContain('c2')
    expect(context.components.size).toBe(0)
    expect(context.cacheIdsToEvict.size).toBe(0)
  })
})
