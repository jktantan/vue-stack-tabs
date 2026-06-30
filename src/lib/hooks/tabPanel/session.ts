/**
 * tabPanel/session - Session 持久化
 *
 * 职责：基于当前 StackTabsRuntimeContext 将当前激活标签保存到 sessionStorage，刷新后恢复。
 */
import type { ITabItem, ITabPage } from '../../model/TabModel'
import { Stack } from '../../model/TabModel'
import type { StackTabsRuntimeContext } from '../stackTabsContext'
import { SESSION_TAB_NAME } from './state'

export interface TabPanelSessionApi {
  getSessionKey: () => string
  saveActiveTabToSession: (tab: ITabItem) => void
  clearSession: () => void
  restoreActiveTabSession: (storedJson: string | null) => void
  restoreTabFromSession: (storedJson: string | null) => ITabItem | null
}

export const createTabPanelSession = (context: StackTabsRuntimeContext): TabPanelSessionApi => {
  const getSessionKey = (): string => context.sessionPrefix.value + SESSION_TAB_NAME

  const saveActiveTabToSession = (tab: ITabItem): void => {
    if (!tab.id) return
    window.sessionStorage.setItem(getSessionKey(), JSON.stringify(tab))
  }

  const clearSession = (): void => {
    window.sessionStorage.removeItem(getSessionKey())
  }

  const restoreActiveTabSession = (storedJson: string | null): void => {
    if (storedJson === null) {
      clearSession()
      return
    }
    window.sessionStorage.setItem(getSessionKey(), storedJson)
  }

  const restoreTabFromSession = (storedJson: string | null): ITabItem | null => {
    if (storedJson == null) return null
    return JSON.parse(storedJson, (key, value) =>
      key === 'pages' ? new Stack<ITabPage>(value) : value
    ) as ITabItem
  }

  return {
    getSessionKey,
    saveActiveTabToSession,
    clearSession,
    restoreActiveTabSession,
    restoreTabFromSession
  }
}
