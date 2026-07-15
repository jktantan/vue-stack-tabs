/**
 * iframe-bridge 子入口（vue-stack-tabs/iframe-bridge）。
 *
 * 供 iframe 内部页面引用，不包含 Vue 组件和样式等副作用，
 * 仅导出 postMessage 通信工具。
 */
export { MSG_OPEN_TAB, MSG_REFRESH, onRefreshRequest, postOpenTab } from './utils/iframeBridge'
export type {
  IframeBridgeOptions,
  IframeOpenTabPayload,
  RefreshRequestOptions
} from './utils/iframeBridge'
