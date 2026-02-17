/**
 * 判断是否为不可嵌入 iframe 的协议
 * @param url - 待检查的 URL 字符串
 * @returns javascript:、data: 等返回 true
 */
export function isInvalidIframeUrl(url: string): boolean {
  return !!(url && /^(javascript|data):/i.test(url))
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
export function parseUrl(uri: string): { path: string; query: Record<string, string> } {
  const [pathPart, queryPart] = uri.split('?')
  if (!queryPart) {
    return { path: pathPart ?? '', query: {} }
  }
  const query: Record<string, string> = {}
  for (const pair of queryPart.split('&')) {
    const [key, val] = pair.split('=')
    if (key != null && val != null && val !== '') {
      query[key] = val
    }
  }
  return { path: pathPart ?? '', query }
}
