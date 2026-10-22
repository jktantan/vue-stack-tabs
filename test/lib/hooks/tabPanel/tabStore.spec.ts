import { beforeEach, describe, expect, it } from 'vitest'
import { computed, isReactive, watch } from 'vue'
import { Stack } from '@/lib/model/TabModel'
import type { ITabItem, ITabPage } from '@/lib/model/TabModel'
import { createStackTabsRuntimeContext } from '@/lib/hooks/stackTabsContext'
import type { StackTabsRuntimeContext } from '@/lib/hooks/stackTabsContext'
import { getTabStore, type TabStoreApi } from '@/lib/hooks/tabPanel/tabStore'

const createPage = (id: string, tabId: string, path = `/${id}`): ITabPage => ({
  id,
  tabId,
  path,
  query: { __tab: `${id}-encoded` }
})

const createTab = (
  id: string,
  pages: ITabPage[] = [createPage(`${id}-p1`, id)],
  options: { pinned?: boolean } = {}
): ITabItem => ({
  id,
  title: id,
  closable: true,
  refreshable: true,
  iframe: false,
  active: false,
  pages: new Stack(pages),
  pinned: options.pinned
})

describe('tabStore', () => {
  let context: StackTabsRuntimeContext
  let store: TabStoreApi

  beforeEach(() => {
    context = createStackTabsRuntimeContext()
    store = getTabStore(context)
  })

  it('每个运行时上下文复用同一个 store 实例', () => {
    expect(getTabStore(context)).toBe(store)
  })

  it('查询标签与页面栈', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))

    expect(store.getTab('t1')?.id).toBe('t1')
    expect(store.getTabs().map((item) => item.id)).toEqual(['t1', 't2'])
    expect(store.getTopPage('t1')?.id).toBe('t1-p1')
    expect(store.getPages('t1').map((page) => page.id)).toEqual(['t1-p1'])
    expect(store.findTabByTopPagePath('/t1-p1')?.id).toBe('t1')
    expect(store.hasTab('t2')).toBe(true)
    expect(store.getTab('missing')).toBeNull()
    expect(store.getPages('missing')).toEqual([])
  })

  it('appendPage / popPages 维护栈顺序并返回被弹出的页面', () => {
    store.addTab(createTab('t1'))

    store.appendPage('t1', createPage('p2', 't1'))
    expect(store.getTopPage('t1')?.id).toBe('p2')

    expect(store.popPages('t1', 1).map((page) => page.id)).toEqual(['p2'])
    expect(store.popPages('t1', 5).map((page) => page.id)).toEqual(['t1-p1'])
    expect(store.getTopPage('t1')).toBeNull()
    expect(store.popPages('t1', 1)).toEqual([])
  })

  it('updatePage 只改刷新版本时不重建 tabs 数组', () => {
    store.addTab(createTab('t1'))
    const before = store.getTabs()

    expect(store.updatePage('t1', 't1-p1', { refreshVersion: 1 })).toBe(true)

    expect(store.getTopPage('t1')?.refreshVersion).toBe(1)
    expect(store.getTabs()).toBe(before)
  })

  it('updatePage 修改页面 id 时同步视图并维护页面栈映射', () => {
    store.addTab(createTab('t1'))
    const before = store.getTabs()

    expect(store.updatePage('t1', 't1-p1', { id: 't1-new' })).toBe(true)

    expect(store.getTopPage('t1')?.id).toBe('t1-new')
    expect(store.getTabs()).not.toBe(before)
  })

  it('updatePages 批量更新页面 id 时只同步一次 tabs', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))
    let syncCount = 0
    watch(
      () => store.getTabs(),
      () => syncCount++,
      { flush: 'sync' }
    )

    store.updatePages([
      { tabId: 't1', pageId: 't1-p1', patch: { id: 't1-new', refreshVersion: 0 } },
      { tabId: 't2', pageId: 't2-p1', patch: { id: 't2-new', refreshVersion: 0 } }
    ])

    expect(store.getTopPage('t1')?.id).toBe('t1-new')
    expect(store.getTopPage('t2')?.id).toBe('t2-new')
    expect(syncCount).toBe(1)
  })

  it('页面栈写入不会重建 tabs 数组', () => {
    store.addTab(createTab('t1'))
    const before = store.getTabs()
    let syncCount = 0
    watch(
      () => store.getTabs(),
      () => syncCount++,
      { flush: 'sync' }
    )

    store.appendPage('t1', createPage('t1-p2', 't1'))
    expect(store.getTopPage('t1')?.id).toBe('t1-p2')
    expect(store.getTabs()).toBe(before)

    store.updatePage('t1', 't1-p2', { _backParams: { from: 'detail' } })
    expect(store.consumeBackParams('t1', 't1-p2')).toEqual({ from: 'detail' })
    expect(store.getTabs()).toBe(before)

    expect(store.popPages('t1', 1).map((page) => page.id)).toEqual(['t1-p2'])
    expect(store.getTabs()).toBe(before)

    store.replacePages('t1', [createPage('t1-p3', 't1')])
    expect(store.getTopPage('t1')?.id).toBe('t1-p3')
    expect(store.getTabs()).toBe(before)

    store.clearPages('t1')
    expect(store.getPages('t1')).toEqual([])
    expect(store.getTabs()).toBe(before)
    expect(syncCount).toBe(0)
  })

  it('重复激活同一标签不会重建 tabs 数组，切换到其它标签仍会重建', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))
    store.activateTab('t1')
    const before = store.getTabs()
    let syncCount = 0
    watch(
      () => store.getTabs(),
      () => syncCount++,
      { flush: 'sync' }
    )

    expect(store.activateTab('t1')?.id).toBe('t1')
    expect(store.getTabs()).toBe(before)
    expect(syncCount).toBe(0)

    store.activateTab('t2')
    expect(store.getTabs()).not.toBe(before)
    expect(syncCount).toBe(1)
  })

  it('tabs 视图不会深度代理 PageStackView', () => {
    store.addTab(createTab('t1'))

    expect(isReactive(store.getTabs()[0]!.pages)).toBe(false)
  })

  it('activateTab 保证同时只有一个 active 标签', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))

    expect(store.activateTab('t1')?.id).toBe('t1')
    expect(store.getActiveTab()?.id).toBe('t1')

    store.activateTab('t2')
    expect(
      store
        .getTabs()
        .filter((tab) => tab.active)
        .map((tab) => tab.id)
    ).toEqual(['t2'])
  })

  it('moveTab 只重排标签，不改变标签对象', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))
    store.addTab(createTab('t3'))
    const first = store.getTab('t1')

    expect(store.moveTab('t1', 2)).toBe(true)
    expect(store.getTabs().map((tab) => tab.id)).toEqual(['t2', 't3', 't1'])
    expect(store.getTabs()[2]).toBe(first)
    expect(store.moveTab('missing', 0)).toBe(false)
    expect(store.moveTab('t1', 2)).toBe(false)
  })

  it('pinned 标签不可移动，其他标签不能插到它前面', () => {
    store.addTab(createTab('home', undefined, { pinned: true }))
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))

    expect(store.moveTab('home', 2)).toBe(false)
    expect(store.moveTab('t2', 0)).toBe(true)
    expect(store.getTabs().map((tab) => tab.id)).toEqual(['home', 't2', 't1'])

    expect(store.moveTab('t1', 0)).toBe(true)
    expect(store.getTabs().map((tab) => tab.id)).toEqual(['home', 't1', 't2'])
  })

  it('removeTab 级联标记页面缓存并返回相邻 active 标签', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))
    store.activateTab('t1')
    store.addCache('t1-p1')
    store.setComponent('t1-p1', {} as never)

    const result = store.removeTab('t1')

    expect(result.status).toBe('removed')
    expect(result.removed?.id).toBe('t1')
    expect(result.nextActiveId).toBe('t2')
    expect(store.getTab('t1')).toBeNull()
    expect(context.cacheIdsToEvict.has('t1-p1')).toBe(true)
    expect(context.caches.value).toContain('t1-p1')
  })

  it('removeTab 关闭非激活标签时立即驱逐缓存', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))
    store.activateTab('t1')
    store.addCache('t2-p1')
    store.setComponent('t2-p1', {} as never)

    const result = store.removeTab('t2')

    expect(result.status).toBe('removed')
    expect(result.nextActiveId).toBe('')
    expect(context.caches.value).not.toContain('t2-p1')
    expect(context.components.has('t2-p1')).toBe(false)
    expect(context.cacheIdsToEvict.size).toBe(0)
    expect(context.tabIdsToEvict.size).toBe(0)
  })

  it('removeTab 拒绝关闭不可关闭或不存在的标签', () => {
    const tab = createTab('t1')
    tab.closable = false
    store.addTab(tab)

    expect(store.removeTab('t1')).toEqual({
      status: 'not-closable',
      removed: null,
      nextActiveId: 't1'
    })
    expect(store.removeTab('missing')).toEqual({
      status: 'not-found',
      removed: null,
      nextActiveId: ''
    })
    expect(store.getTab('t1')?.id).toBe('t1')
  })

  it('removeTabs 批量移除并返回被移除的标签', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))
    store.addTab(createTab('t3'))

    const removed = store.removeTabs((tab) => tab.id !== 't2')

    expect(removed.map((tab) => tab.id)).toEqual(['t1', 't3'])
    expect(store.getTabs().map((tab) => tab.id)).toEqual(['t2'])
  })

  it('页面快照深拷贝 query，replacePages 可恢复页面栈', () => {
    store.addTab(createTab('t1'))

    const snapshot = store.getPageSnapshot('t1')
    snapshot[0]!.query!.extra = 'internal-only'
    expect(store.getTopPage('t1')?.query?.extra).toBeUndefined()

    store.clearPages('t1')
    expect(store.getTopPage('t1')).toBeNull()

    store.replacePages('t1', snapshot)
    expect(store.getTopPage('t1')?.query?.extra).toBe('internal-only')
  })

  it('updatePage 修改刷新版本与页面 id，未知页面返回 false', () => {
    store.addTab(createTab('t1'))

    expect(store.updatePage('t1', 't1-p1', { refreshVersion: 2 })).toBe(true)
    expect(store.getTopPage('t1')?.refreshVersion).toBe(2)

    expect(store.updatePage('t1', 't1-p1', { id: 't1-p1-next' })).toBe(true)
    expect(store.getTopPage('t1')?.id).toBe('t1-p1-next')
    expect(store.updatePage('t1', 'missing', { refreshVersion: 1 })).toBe(false)
    expect(store.updatePage('missing', 't1-p1', { refreshVersion: 1 })).toBe(false)
  })

  it('consumeBackParams 只读取并清除当前栈顶页面的参数', () => {
    store.addTab(createTab('t1'))
    store.updatePage('t1', 't1-p1', { _backParams: { from: 'detail' } })

    expect(store.consumeBackParams('t1', 'missing')).toBeNull()
    expect(store.getTopPage('t1')?._backParams).toEqual({ from: 'detail' })

    expect(store.consumeBackParams('t1', 't1-p1')).toEqual({ from: 'detail' })
    expect(store.getTopPage('t1')?._backParams).toBeUndefined()
    expect(store.consumeBackParams('t1', 't1-p1')).toBeNull()
  })

  it('tabs 兼容视图的 pages 读写会转发到 store', () => {
    store.addTab(createTab('t1'))
    const tab = store.getTab('t1')!

    expect(tab.pages.peek()?.id).toBe('t1-p1')
    expect(tab.pages.size()).toBe(1)

    tab.pages.push(createPage('p2', 't1'))
    expect(store.getTopPage('t1')?.id).toBe('p2')
    expect(tab.pages.peek()?.id).toBe('p2')

    expect(tab.pages.pop()?.id).toBe('p2')
    expect(store.getTopPage('t1')?.id).toBe('t1-p1')

    tab.pages.clear()
    expect(store.getTopPage('t1')).toBeNull()
  })

  it('activateTab 后兼容视图的 active 状态保持同步', () => {
    store.addTab(createTab('t1'))
    store.addTab(createTab('t2'))

    expect(store.getTabs().map((tab) => [tab.id, tab.active])).toEqual([
      ['t1', false],
      ['t2', false]
    ])

    store.activateTab('t2')

    expect(store.getTabs().map((tab) => [tab.id, tab.active])).toEqual([
      ['t1', false],
      ['t2', true]
    ])
  })

  it('兼容视图的页面变化会触发 Vue 计算属性更新', () => {
    store.addTab(createTab('t1'))
    const topId = computed(() => store.getTab('t1')?.pages.peek()?.id)

    expect(topId.value).toBe('t1-p1')
    store.appendPage('t1', createPage('p2', 't1'))
    expect(topId.value).toBe('p2')
    store.popPages('t1', 1)
    expect(topId.value).toBe('t1-p1')
  })

  it('兼容视图可被 JSON 序列化为完整页面栈', () => {
    store.addTab(createTab('t1'))

    const serialized = JSON.parse(JSON.stringify(store.getTab('t1')))

    expect(serialized).toMatchObject({
      id: 't1',
      pages: [{ id: 't1-p1', tabId: 't1', path: '/t1-p1' }]
    })
  })

  it('updatePage 修改页面 id 后兼容视图读取新 id', () => {
    store.addTab(createTab('t1'))
    const tab = store.getTab('t1')!

    expect(store.updatePage('t1', 't1-p1', { id: 't1-p1-next' })).toBe(true)

    expect(tab.pages.peek()?.id).toBe('t1-p1-next')
    expect(store.getTopPage('t1')?.id).toBe('t1-p1-next')
  })

  it('缓存与组件注册表支持快照恢复', () => {
    store.addCache('c1')
    store.setComponent('c1', {} as never)

    const cacheSnapshot = store.snapshotCaches()
    const componentSnapshot = store.snapshotComponents()

    store.removeCache('c1')
    store.deleteComponent('c1')
    expect(store.getComponent('c1')).toBeUndefined()

    store.restoreCaches(cacheSnapshot)
    store.restoreComponents(componentSnapshot)

    expect(store.snapshotCaches()).toEqual(['c1'])
    expect(store.getComponent('c1')).toBeDefined()
  })

  it('reset 清空 tabs、caches、components 与驱逐标记', () => {
    store.addTab(createTab('t1'))
    store.addCache('t1-p1')
    store.setComponent('t1-p1', {} as never)
    store.markCacheForEviction('t1-p1')
    store.markTabPagesForEviction(store.getTab('t1')!)

    store.reset()

    expect(store.getTabs()).toEqual([])
    expect(context.caches.value).toEqual([])
    expect(context.components.size).toBe(0)
    expect(context.cacheIdsToEvict.size).toBe(0)
    expect(context.tabIdsToEvict.size).toBe(0)
  })
})
