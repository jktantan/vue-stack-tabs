import type { LocationQueryRaw } from 'vue-router'

/**
 * iframe 与父窗口的 postMessage 桥接
 *
 * 在 iframe 内的页面中引入，用于：
 * - 接收父窗口的刷新指令并执行
 * - 向父窗口发送打开新标签的请求
 */

/** 刷新消息：父 -> iframe，iframe 内页面需监听并执行 location.reload() 或自身刷新逻辑 */
export const MSG_REFRESH = 'vue-stack-tabs:refresh'

/** 打开标签消息：iframe -> 父，payload 为 ITabData */
export const MSG_OPEN_TAB = 'vue-stack-tabs:openTab'

export interface IframeBridgeOptions {
  targetOrigin?: string
}

export interface RefreshRequestOptions {
  allowedOrigins?: string[]
}

export interface IframeOpenTabPayload {
  id?: string
  title: string
  path: string
  query?: LocationQueryRaw
  closable?: boolean
  refreshable?: boolean
  iframe?: boolean
  iframeRefreshMode?: 'postMessage' | 'reload'
}

/**
 * 在 iframe 内调用：向父窗口请求打开新标签
 * @param payload 标签数据，至少需 title、path
 */
export function postOpenTab(
  payload: IframeOpenTabPayload,
  options: IframeBridgeOptions = {}
): void {
  if (typeof window === 'undefined' || !window.parent) return
  window.parent.postMessage(
    { type: MSG_OPEN_TAB, payload },
    options.targetOrigin ?? '*' // 父窗口可校验 origin，此处默认 * 便于跨子域
  )
}

/**
 * 在 iframe 内调用：注册刷新监听，收到父窗口刷新指令时执行 callback
 * @param callback 默认 location.reload()，可自定义
 * @returns 取消监听的函数
 */
export function onRefreshRequest(
  callback: () => void = () => window.location.reload(),
  options: RefreshRequestOptions = {}
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const allowedOrigins = options.allowedOrigins ?? []
  const handler = (ev: MessageEvent) => {
    if (ev.source !== window.parent) return
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(ev.origin)) return
    if (ev.data?.type === MSG_REFRESH) {
      callback()
    }
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}
