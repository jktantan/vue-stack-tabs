import type { ITabBase } from '../model/TabModel'
import { isRecord } from './typeGuards'

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
 * 当前格式为 JSON + Base64URL；解码同时兼容标准 Base64（历史链接）与
 * 旧版 id|title|iframe|closable|refreshable|mode 编码。
 */

const MAX_DECODED_TAB_INFO_LENGTH = 2048
const MAX_ENCODED_TAB_INFO_LENGTH = 4096
/** URL 中 __tab 的 title 上限，避免超长标题把 payload 顶到解码上限导致 id 丢失。 */
const MAX_TAB_TITLE_LENGTH = 256
/** legacy 格式中 id 的合理上限，用于拒绝任意字符串伪装成标签 id。 */
const MAX_LEGACY_TAB_ID_LENGTH = 128

/**
 * 把 UTF-8 字符串编码为 Base64URL（无填充、`+`→`-`、`/`→`_`）。
 * 使用 TextEncoder 取代已废弃的 escape/unescape，同时让结果可直接放进 URL。
 */
const encodeBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * 解码 Base64URL / 标准 Base64。
 * 兼容旧链接：先还原 URL-safe 字符与填充，再按 UTF-8 解码。
 */
const decodeBase64 = (encoded: string): string => {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new TextDecoder().decode(bytes)
}

const DEFAULT_TAB_INFO: ITabBase = {
  id: '',
  title: '',
  iframe: false,
  closable: true,
  refreshable: true,
  iframeRefreshMode: 'postMessage'
}

/** 检测控制字符，避免 legacy id 携带不可见字符。 */
const hasControlCharacter = (value: string): boolean => {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 31 || code === 127) return true
  }
  return false
}

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

/**
 * 旧版分隔符格式：id|title|iframe|closable|refreshable[|mode]。
 *
 * 严格校验字段数量与 Y/N 标记：非法字符串（例如 `?__tab=invalid`）不能再被解析成
 * 任意 id 的标签。格式不合法时返回默认值，由路由层走兜底标签逻辑。
 */
const decodeLegacyTabInfo = (tabString: string): ITabBase => {
  const tabValues: string[] = tabString.split('|')
  if (tabValues.length < 5 || tabValues.length > 6) return { ...DEFAULT_TAB_INFO }

  const [id = '', title = '', iframe, closable, refreshable, mode] = tabValues
  const isFlag = (value: string | undefined): value is 'Y' | 'N' => value === 'Y' || value === 'N'
  const hasValidId =
    id.length > 0 &&
    id.length <= MAX_LEGACY_TAB_ID_LENGTH &&
    id.trim() === id &&
    !hasControlCharacter(id)

  if (!hasValidId || !isFlag(iframe) || !isFlag(closable) || !isFlag(refreshable)) {
    return { ...DEFAULT_TAB_INFO }
  }
  if (mode !== undefined && mode !== '' && mode !== 'R') return { ...DEFAULT_TAB_INFO }

  return {
    id,
    title,
    iframe: iframe === 'Y',
    closable: closable === 'Y',
    refreshable: refreshable === 'Y',
    iframeRefreshMode: mode === 'R' ? 'reload' : 'postMessage'
  }
}

export const encodeTabInfo = (tabData: ITabBase): string => {
  const payload: EncodedTabInfoV1 = {
    version: 1,
    id: tabData.id,
    title: tabData.title.slice(0, MAX_TAB_TITLE_LENGTH),
    iframe: tabData.iframe,
    closable: tabData.closable,
    refreshable: tabData.refreshable,
    iframeRefreshMode: tabData.iframeRefreshMode === 'reload' ? 'reload' : 'postMessage'
  }
  return encodeBase64Url(JSON.stringify(payload))
}

const decodeTabInfoUncached = (encoded: string): ITabBase => {
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

/**
 * 单条解码缓存：同一 __tab 在一次会话/连续导航中会反复出现，
 * 缓存最近一次结果可省掉 Base64 + TextDecoder + JSON.parse。
 * 返回值始终是副本，避免调用方修改缓存对象。
 */
let cachedEncodedTabInfo = ''
let cachedTabInfo: ITabBase | null = null

export const decodeTabInfo = (encoded: string): ITabBase => {
  if (encoded === cachedEncodedTabInfo && cachedTabInfo) {
    return { ...cachedTabInfo }
  }

  const decoded = decodeTabInfoUncached(encoded)
  cachedEncodedTabInfo = encoded
  cachedTabInfo = decoded
  return { ...decoded }
}

/**
 * 生成运行时 id。
 *
 * `crypto.randomUUID` 仅在安全上下文（https / localhost）可用；内网 http 部署时
 * 回退到 `crypto.getRandomValues`（非安全上下文同样可用），最后才退回 Math.random，
 * 避免在受限环境下直接抛 TypeError 导致整个组件不可用。
 */
export const createId = (): string => {
  const cryptoObject = globalThis.crypto

  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof cryptoObject?.getRandomValues === 'function') {
    cryptoObject.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  // RFC 4122 version 4 + variant bits
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80

  const hex: string[] = []
  for (const byte of bytes) hex.push(byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

export const createPageId = (): string => createId()
