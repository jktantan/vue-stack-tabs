/**
 * URL 解析与安全校验工具。
 *
 * 提供标签 URL 的安全检查（防止 javascript: 等危险 scheme）、
 * 跨域判断、query 参数克隆与比较、保留参数过滤等功能。
 */
import type { LocationQueryRaw } from 'vue-router'

const ALLOWED_ABOUT_URLS = new Set(['about:blank'])
const STACK_TABS_RESERVED_QUERY_KEYS = new Set(['__tab', '__src'])

const hasUnsafeUrlCharacter = (value: string): boolean => {
  for (const char of value) {
    const code = char.charCodeAt(0)
    const isControl = code <= 31 || code === 127 || (code >= 128 && code <= 159)
    const isZeroWidth =
      code === 0x200b || code === 0x200c || code === 0x200d || code === 0x2060 || code === 0xfeff
    const isBidiControl = (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)
    if (isControl || isZeroWidth || isBidiControl) return true
  }
  return false
}
const getUrlBase = (): string => {
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost'
}

/**
 * 判断标签 URL 是否允许进入 iframe/window.open/router 等 URL sink。
 * 允许相对路径、http(s) URL 与 about:blank；拒绝其它 scheme。
 */
export function isAllowedTabUrl(url: string): boolean {
  const value = url.trim()
  if (!value) return true
  if (hasUnsafeUrlCharacter(value)) return false
  if (ALLOWED_ABOUT_URLS.has(value.toLowerCase())) return true
  if (value.toLowerCase().startsWith('about:')) return false

  try {
    const parsed = new URL(value, getUrlBase())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 判断是否为不允许嵌入 iframe 的 URL
 * @param url - 待检查的 URL 字符串
 * @returns 非 allowlist URL 返回 true
 */
export function isInvalidIframeUrl(url: string): boolean {
  return !isAllowedTabUrl(url)
}

/** 非法 URL 降级为 about:blank，避免进入 iframe/window.open 等 URL sink */
export function toSafeTabUrl(url: string): string {
  return isAllowedTabUrl(url) ? url : 'about:blank'
}

export function decodeSafeTabUrl(encodedUrl: unknown): string {
  if (typeof encodedUrl !== 'string') return 'about:blank'
  try {
    return toSafeTabUrl(decodeURIComponent(encodedUrl))
  } catch {
    return 'about:blank'
  }
}

/**
 * 判断 URL 是否为跨域（相对路径或同源视为同域）
 * @param url - 待检查的 URL
 */
export function isCrossOriginUrl(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false
  try {
    const cur = typeof window !== 'undefined' ? window.location : { origin: 'http://localhost' }
    const u = new URL(url, cur.origin)
    return u.origin !== cur.origin
  } catch {
    return true
  }
}

/**
 * 解析 URL 字符串为 path 和 query
 * @param uri 完整 URL 或 path?query 字符串
 */
export function parseUrl(uri: string): { path: string; query: LocationQueryRaw } {
  const [pathPart = '', queryPart] = uri.split('?')
  if (queryPart === undefined) {
    return { path: pathPart, query: {} }
  }

  const params = new URLSearchParams(queryPart)
  const query: LocationQueryRaw = {}
  for (const [key, value] of params.entries()) {
    const existing = query[key]
    if (existing === undefined) {
      query[key] = value
      continue
    }
    query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
  }
  return { path: pathPart, query }
}

/** 浅克隆 LocationQueryRaw，避免引用共享导致的副作用 */
export function cloneLocationQuery(query: LocationQueryRaw = {}): LocationQueryRaw {
  const cloned: LocationQueryRaw = {}
  for (const [key, value] of Object.entries(query)) {
    cloned[key] = Array.isArray(value) ? [...value] : value
  }
  return cloned
}

export interface CloneablePage {
  query?: LocationQueryRaw
  _backParams?: Record<string, unknown>
}

/** 深克隆页面对象的 query 和 _backParams，防止跨页面引用污染 */
export function clonePage<T extends CloneablePage>(page: T): T {
  return {
    ...page,
    query: page.query ? cloneLocationQuery(page.query) : undefined,
    _backParams: page._backParams ? { ...page._backParams } : undefined
  }
}

/** 忽略 __tab/__src/_back 等内部保留 key 后比较两个 query 是否等价 */
export function isSameQueryIgnoringReserved(
  a: LocationQueryRaw = {},
  b: LocationQueryRaw = {}
): boolean {
  const clean = (q: LocationQueryRaw): Record<string, string> => {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(q)) {
      if (STACK_TABS_RESERVED_QUERY_KEYS.has(key) || key === '_back') continue
      result[key] = String(value ?? '')
    }
    return result
  }
  const ca = clean(a)
  const cb = clean(b)
  const keysB = Object.keys(cb)
  if (keysB.length === 0) return true
  if (keysB.length !== Object.keys(ca).length) return false
  return keysB.every((k) => ca[k] === cb[k])
}

/** 移除 query 中的 vue-stack-tabs 保留参数（__tab、__src），返回干净的 query */
export function omitStackTabsReservedQuery(query: LocationQueryRaw = {}): LocationQueryRaw {
  const sanitized: LocationQueryRaw = {}
  for (const [key, value] of Object.entries(query)) {
    if (STACK_TABS_RESERVED_QUERY_KEYS.has(key)) continue
    sanitized[key] = Array.isArray(value) ? [...value] : value
  }
  return sanitized
}
