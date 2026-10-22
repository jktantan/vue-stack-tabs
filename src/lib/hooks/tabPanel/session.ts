/**
 * tabPanel/session - Session 持久化
 *
 * 职责：基于当前 StackTabsRuntimeContext 将当前激活标签保存到 sessionStorage，刷新后恢复。
 */
import type { ITabItem, ITabPage } from '../../model/TabModel'
import { Stack } from '../../model/TabModel'
import { isRecord } from '../../utils/typeGuards'
import type { StackTabsRuntimeContext } from '../stackTabsContext'
import { SESSION_TAB_NAME } from './state'

const isRestoredTab = (value: unknown): value is ITabItem =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string' &&
  typeof value.closable === 'boolean' &&
  typeof value.refreshable === 'boolean' &&
  typeof value.iframe === 'boolean' &&
  typeof value.active === 'boolean' &&
  value.pages instanceof Stack

export interface TabPanelSessionApi {
  getSessionKey: () => string
  saveActiveTabToSession: (tab: ITabItem) => void
  clearSession: () => void
  restoreActiveTabSession: (storedJson: string | null) => void
  restoreTabFromSession: (storedJson: string | null) => ITabItem | null
}

export const createTabPanelSession = (context: StackTabsRuntimeContext): TabPanelSessionApi => {
  const getSessionKey = (): string => context.sessionPrefix.value + SESSION_TAB_NAME
  let pendingWrite: { tab: ITabItem; version: number } | null = null
  let writeVersion = 0
  let writeScheduled = false
  /** 最近一次成功写入的内容；与待写入内容相同时跳过 setItem。 */
  let lastPersistedJson: string | null = null

  /**
   * 写入 sessionStorage，捕获隐私模式（QuotaExceededError）等异常，
   * 避免在受限浏览器环境下抛出未处理错误。SSR 环境无 window 时直接跳过。
   */
  const safeSetItem = (key: string, value: string): boolean => {
    if (typeof window === 'undefined') return false
    try {
      window.sessionStorage.setItem(key, value)
      return true
    } catch (error) {
      if (!import.meta.env.PROD) {
        console.warn('[vue-stack-tabs] Failed to write sessionStorage:', error)
      }
      return false
    }
  }

  const safeRemoveItem = (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.removeItem(key)
    } catch (error) {
      if (!import.meta.env.PROD) {
        console.warn('[vue-stack-tabs] Failed to clear sessionStorage:', error)
      }
    }
  }

  const flushPendingWrite = () => {
    writeScheduled = false
    const write = pendingWrite
    pendingWrite = null
    if (!write || write.version !== writeVersion) return
    const serialized = JSON.stringify(write.tab)
    if (serialized === lastPersistedJson) return
    if (safeSetItem(getSessionKey(), serialized)) lastPersistedJson = serialized
  }

  const invalidatePendingWrite = () => {
    writeVersion++
    pendingWrite = null
  }

  const saveActiveTabToSession = (tab: ITabItem): void => {
    if (!tab.id) return
    pendingWrite = { tab, version: ++writeVersion }
    if (writeScheduled) return
    writeScheduled = true
    queueMicrotask(flushPendingWrite)
  }

  const clearSession = (): void => {
    invalidatePendingWrite()
    safeRemoveItem(getSessionKey())
    lastPersistedJson = null
  }

  const restoreActiveTabSession = (storedJson: string | null): void => {
    if (storedJson === null) {
      clearSession()
      return
    }
    invalidatePendingWrite()
    if (safeSetItem(getSessionKey(), storedJson)) lastPersistedJson = storedJson
  }

  const restoreTabFromSession = (storedJson: string | null): ITabItem | null => {
    if (storedJson == null) return null
    try {
      const restored = JSON.parse(storedJson, (key, value) =>
        key === 'pages' && Array.isArray(value) ? new Stack<ITabPage>(value) : value
      )
      if (!isRestoredTab(restored)) {
        clearSession()
        return null
      }
      return restored as ITabItem
    } catch {
      clearSession()
      return null
    }
  }

  return {
    getSessionKey,
    saveActiveTabToSession,
    clearSession,
    restoreActiveTabSession,
    restoreTabFromSession
  }
}
