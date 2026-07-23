// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { Stack } from '@/lib/model/TabModel'
import { createStackTabsRuntimeContext } from '@/lib/hooks/stackTabsContext'
import { createTabPanelSession } from '@/lib/hooks/tabPanel/session'

describe('tabPanel session', () => {
  const context = createStackTabsRuntimeContext()
  const session = createTabPanelSession(context)

  beforeEach(() => {
    window.sessionStorage.clear()
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
})
