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

/**
 * 把任意 UTF-8 字符串安全地编码为 base64（避免中文/特殊字符直接 btoa 抛错）。
 * 使用 encodeURIComponent + unescape 是经典跨浏览器方案，比手动管理 TextEncoder 更简洁。
 */
const encodeBase64 = (value: string): string =>
  btoa(unescape(encodeURIComponent(value)))

/** encodeBase64 的逆操作，非合法 base64 时抛错，由调用方 try/catch。 */
const decodeBase64 = (encoded: string): string =>
  decodeURIComponent(escape(atob(encoded)))

const DEFAULT_TAB_INFO: ITabBase = {
  id: '',
  title: '',
  iframe: false,
  closable: true,
  refreshable: true,
  iframeRefreshMode: 'postMessage'
}

import { isRecord } from './typeGuards'

const toTabInfo = (payload: unknown): ITabBase => {
  if (!isRecord(payload)) return { ...DEFAULT_TAB_INFO }

  return {
    id: typeof payload.id === 'string' ? payload.id : undefined,
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
  if (typeof encoded !== 'string' || encoded.length > MAX_ENCODED_TAB_INFO_LENGTH) {
    return { ...DEFAULT_TAB_INFO }
  }

  let tabString: string
  try {
    tabString = decodeBase64(encoded)
  } catch {
    return { ...DEFAULT_TAB_INFO }
  }

  if (tabString.length > MAX_DECODED_TAB_INFO_LENGTH) return { ...DEFAULT_TAB_INFO }
  if (!tabString.trim().startsWith('{')) return decodeLegacyTabInfo(tabString)

  try {
    return toTabInfo(JSON.parse(tabString))
  } catch {
    return { ...DEFAULT_TAB_INFO }
  }
}

export const createPageId = (): string => crypto.randomUUID()
