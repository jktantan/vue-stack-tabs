import type { ITabBase } from '../model/TabModel'

interface EncodedTabInfoV1 {
  version: 1
  id?: string
  title: string
  iframe?: boolean
  closable?: boolean
  refreshable?: boolean
  iframeRefreshMode?: 'postMessage' | 'reload'
}

/**
 * 标签信息编解码器
 *
 * 职责：将标签元数据编码为 URL query 可用的短字符串，用于 __tab 参数。
 * 当前格式为 JSON + Base64，兼容旧版 id|title|iframe|closable|refreshable|mode 编码。
 */

const MAX_DECODED_TAB_INFO_LENGTH = 2048
const MAX_ENCODED_TAB_INFO_LENGTH = 4096

const encodeBase64 = (value: string): string => encodeURIComponent(btoa(encodeURIComponent(value)))
const decodeBase64 = (encoded: string): string =>
  decodeURIComponent(atob(decodeURIComponent(encoded)))

const DEFAULT_TAB_INFO: ITabBase = {
  id: '',
  title: '',
  iframe: false,
  closable: true,
  refreshable: true,
  iframeRefreshMode: 'postMessage'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toTabInfo = (payload: unknown): ITabBase => {
  if (!isRecord(payload)) return { ...DEFAULT_TAB_INFO }

  return {
    id: typeof payload.id === 'string' ? payload.id : DEFAULT_TAB_INFO.id,
    title: typeof payload.title === 'string' ? payload.title : DEFAULT_TAB_INFO.title,
    iframe: typeof payload.iframe === 'boolean' ? payload.iframe : DEFAULT_TAB_INFO.iframe,
    closable: typeof payload.closable === 'boolean' ? payload.closable : DEFAULT_TAB_INFO.closable,
    refreshable:
      typeof payload.refreshable === 'boolean' ? payload.refreshable : DEFAULT_TAB_INFO.refreshable,
    iframeRefreshMode: payload.iframeRefreshMode === 'reload' ? 'reload' : 'postMessage'
  }
}

const decodeLegacyTabInfo = (tabString: string): ITabBase => {
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

export const encodeTabInfo = (tabData: ITabBase): string => {
  const payload: EncodedTabInfoV1 = {
    version: 1,
    id: tabData.id,
    title: tabData.title,
    iframe: tabData.iframe,
    closable: tabData.closable,
    refreshable: tabData.refreshable,
    iframeRefreshMode: tabData.iframeRefreshMode === 'reload' ? 'reload' : 'postMessage'
  }
  return encodeBase64(JSON.stringify(payload))
}

export const decodeTabInfo = (encoded: string): ITabBase => {
  if (encoded.length > MAX_ENCODED_TAB_INFO_LENGTH) return { ...DEFAULT_TAB_INFO }

  try {
    const tabString = decodeBase64(encoded)
    if (tabString.length > MAX_DECODED_TAB_INFO_LENGTH) return { ...DEFAULT_TAB_INFO }
    if (!tabString.trim().startsWith('{')) return decodeLegacyTabInfo(tabString)

    return toTabInfo(JSON.parse(tabString))
  } catch {
    return { ...DEFAULT_TAB_INFO }
  }
}

export const createPageId = (): string => crypto.randomUUID()
