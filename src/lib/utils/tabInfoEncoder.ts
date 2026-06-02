import type { ITabBase } from '../model/TabModel'

/**
 * 标签信息编解码器
 *
 * 职责：将标签元数据编码为 URL query 可用的短字符串，用于 __tab 参数
 * 格式: id|title|iframe|closable|refreshable|mode，Base64 编码后写入 query.__tab
 */

export const encodeTabInfo = (tabData: ITabBase): string => {
  const mode =
    (tabData as { iframeRefreshMode?: string }).iframeRefreshMode === 'reload' ? 'R' : 'P'
  const info = `${tabData.id}|${tabData.title}|${tabData.iframe ? 'Y' : 'N'}|${tabData.closable ? 'Y' : 'N'}|${tabData.refreshable ? 'Y' : 'N'}|${mode}`
  return encodeURIComponent(btoa(encodeURIComponent(info)))
}

export const decodeTabInfo = (encoded: string): ITabBase => {
  const tabString = decodeURIComponent(atob(decodeURIComponent(encoded)))
  const tabValues: string[] = tabString.split('|')
  const refreshMode = tabValues[5] === 'R' ? ('reload' as const) : ('postMessage' as const)
  return {
    id: tabValues[0] ?? '',
    title: tabValues[1] ?? '',
    iframe: tabValues[2] === 'Y',
    closable: tabValues[3] === 'Y',
    refreshable: tabValues[4] === 'Y',
    iframeRefreshMode: refreshMode
  }
}

export const createPageId = (): string => crypto.randomUUID()
