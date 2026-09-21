// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Stack } from '@/lib/model/TabModel'
import { createStackTabsRuntimeContext } from '@/lib/hooks/stackTabsContext'
import { createTabPanelSession } from '@/lib/hooks/tabPanel/session'

describe('tabPanel session', () => {
  let session: ReturnType<typeof createTabPanelSession>

  beforeEach(() => {
    window.sessionStorage.clear()
    session = createTabPanelSession(createStackTabsRuntimeContext())
  })

  it('忽略并清除损坏的 session 数据', () => {
    window.sessionStorage.setItem(session.getSessionKey(), '{invalid-json')

    expect(session.restoreTabFromSession('{invalid-json')).toBeNull()
    expect(window.sessionStorage.getItem(session.getSessionKey())).toBeNull()
  })

  it('忽略不符合 tab 结构的 session 数据', () => {
    window.sessionStorage.setItem(session.getSessionKey(), JSON.stringify({ id: 'tab-1' }))

    expect(session.restoreTabFromSession(JSON.stringify({ id: 'tab-1' }))).toBeNull()
    expect(window.sessionStorage.getItem(session.getSessionKey())).toBeNull()
  })

  it('恢复有效 tab 的页面栈', () => {
    const storedTab = {
      id: 'tab-1',
      title: 'Tab 1',
      closable: true,
      refreshable: true,
      iframe: false,
      active: true,
      pages: [{ id: 'page-1', tabId: 'tab-1', path: '/one' }]
    }

    const restored = session.restoreTabFromSession(JSON.stringify(storedTab))

    expect(restored?.pages).toBeInstanceOf(Stack)
    expect(restored?.pages.peek()).toMatchObject({ id: 'page-1' })
  })

  it('合并同一微任务内的连续写入，仅持久化最后一个 tab', async () => {
    // happy-dom 的 Storage 写入无法被 spy 可靠截获；序列化次数可直接验证写入合并。
    const stringify = vi.spyOn(JSON, 'stringify')
    const tab = (id: string) => ({
      id,
      title: id,
      closable: true,
      refreshable: true,
      iframe: false,
      active: true,
      pages: new Stack([{ id: `${id}-page`, tabId: id, path: `/${id}` }])
    })

    session.saveActiveTabToSession(tab('one'))
    session.saveActiveTabToSession(tab('two'))
    await new Promise<void>((resolve) => queueMicrotask(resolve))

    const persistedTabs = stringify.mock.calls.filter(
      ([value]) => typeof value === 'object' && value !== null && 'id' in value
    )
    expect(persistedTabs).toHaveLength(1)
    expect(persistedTabs[0]?.[0]).toMatchObject({ id: 'two' })
    expect(window.sessionStorage.getItem(session.getSessionKey())).toContain('"id":"two"')
  })

  it('回滚恢复会使已排队的旧写入失效', async () => {
    const previous = JSON.stringify({ id: 'previous' })
    session.saveActiveTabToSession({
      id: 'next',
      title: 'Next',
      closable: true,
      refreshable: true,
      iframe: false,
      active: true,
      pages: new Stack([{ id: 'next-page', tabId: 'next', path: '/next' }])
    })
    session.restoreActiveTabSession(previous)
    await Promise.resolve()

    expect(window.sessionStorage.getItem(session.getSessionKey())).toBe(previous)
  })
})
