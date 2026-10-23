import { onUnmounted } from 'vue'
import { TabEventType, useTabEmitter } from '../hooks/useTabEventBus'
import { resolveTabPageContext } from './tabPageContext'

/**
 * useTabLoading - 标签内页面加载状态 Hook
 *
 * 职责：通过 PAGE_LOADING 事件控制 PageLoading 组件的显示/隐藏
 * 使用范围：标签内的页面组件；tabId 由缓存包装组件 provide，
 * 页面通过 tabPageContext 解析（兼容旧版 attrs / props 注入）。
 */
export default () => {
  const emitter = useTabEmitter()
  const pageContext = resolveTabPageContext()
  const getTabId = () => pageContext?.tabId ?? ''
  onUnmounted(() => {
    closeTabLoading()
  })
  /** 显示加载遮罩 */
  const openTabLoading = () => {
    emitter.emit(TabEventType.PAGE_LOADING, { tId: getTabId(), value: true })
  }

  /** 隐藏加载遮罩 */
  const closeTabLoading = () => {
    emitter.emit(TabEventType.PAGE_LOADING, { tId: getTabId(), value: false })
  }
  return { openTabLoading, closeTabLoading }
}
