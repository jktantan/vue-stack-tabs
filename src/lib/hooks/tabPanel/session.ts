/**
 * tabPanel/session - Session 持久化
 *
 * 职责：将当前激活标签保存到 sessionStorage，刷新后恢复
 */
import type { ITabItem } from '../../model/TabModel'
import { Stack } from '../../model/TabModel'
import type { ITabPage } from '../../model/TabModel'
import { SESSION_TAB_NAME, sessionPrefix } from './state'

/** 获取 sessionStorage 的 key */
export const getSessionKey = () => sessionPrefix + SESSION_TAB_NAME

/** 将当前激活的标签保存到 sessionStorage */
export const saveActiveTabToSession = (tab: ITabItem) => {
  if (!tab.id) return
  window.sessionStorage.setItem(getSessionKey(), JSON.stringify(tab))
}

/** 清除 sessionStorage 中的激活标签 */
export const clearSession = () => {
  window.sessionStorage.removeItem(getSessionKey())
}

/** 从 sessionStorage 解析恢复的标签（含 Stack 反序列化） */
export const restoreTabFromSession = (
  storedJson: string | null
): ITabItem | null => {
  if (storedJson == null) return null
  return JSON.parse(storedJson, (k, v) =>
    k === 'pages' ? new Stack<ITabPage>(v) : v
  ) as ITabItem
}
