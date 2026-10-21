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
 * 判断 URL 是否为跨域（相对路径或同源视为同域）。
 *
 * 统一用 `new URL(url, origin)` 解析，协议相对 URL（`//host/path`）也会按实际
 * origin 判定，避免被误判为同源。`about:blank` 与相对路径视为同源。
 * @param url - 待检查的 URL
 */
export function isCrossOriginUrl(url: string): boolean {
  if (!url) return false
  const base = getUrlBase()
  try {
    const parsed = new URL(url, base)
    // 非 http(s) 不是「跨域」，而是非法 URL；由 isAllowedTabUrl 负责拒绝。
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return parsed.origin !== new URL(base).origin
  } catch {
    return true
  }
}

/**
 * 解析 URL 字符串为 path、query 和 hash。
 *
 * hash 会先从 query 中剥离，避免 `/page?x=1#section` 被解析成 `query.x = '1#section'`。
 * @param uri 完整 URL 或 path?query#hash 字符串
 */
export function parseUrl(uri: string): {
  path: string
  query: LocationQueryRaw
  hash: string
} {
  const hashIndex = uri.indexOf('#')
  const hash = hashIndex >= 0 ? uri.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? uri.slice(0, hashIndex) : uri
  const [pathPart = '', queryPart] = withoutHash.split('?')
  if (queryPart === undefined) {
    return { path: pathPart, query: {}, hash }
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
  return { path: pathPart, query, hash }
}

/**
 * 规范化 pathname：去掉末尾多余斜杠（根路径 `/` 保留）。
 * 页面栈比较与写入统一使用，避免 `/list` 与 `/list/` 被当成两个页面。
 */
export function normalizePathname(path: string): string {
  if (!path || path === '/') return path
  const normalized = path.replace(/\/+$/, '')
  return normalized || '/'
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
  const clean = (q: LocationQueryRaw): Record<string, string | string[]> => {
    const result: Record<string, string | string[]> = {}
    for (const [key, value] of Object.entries(q)) {
      if (STACK_TABS_RESERVED_QUERY_KEYS.has(key) || key === '_back') continue
      result[key] = Array.isArray(value)
        ? value.map((item) => String(item ?? ''))
        : String(value ?? '')
    }
    return result
  }
  const ca = clean(a)
  const cb = clean(b)
  const keysA = Object.keys(ca)
  const keysB = Object.keys(cb)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => {
    const aValue = ca[key]
    const bValue = cb[key]
    if (Array.isArray(aValue) || Array.isArray(bValue)) {
      return (
        Array.isArray(aValue) &&
        Array.isArray(bValue) &&
        aValue.length === bValue.length &&
        aValue.every((value, index) => value === bValue[index])
      )
    }
    return aValue === bValue
  })
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
