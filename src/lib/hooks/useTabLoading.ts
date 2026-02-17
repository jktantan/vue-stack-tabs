import { type ComponentInternalInstance, getCurrentInstance, onUnmounted } from 'vue'
import { TabEventType, useTabEmitter } from '../hooks/useTabEventBus'

/**
 * useTabLoading - 标签内页面加载状态 Hook
 *
 * 职责：通过 PAGE_LOADING 事件控制 PageLoading 组件的显示/隐藏
 * 使用范围：标签内的页面组件（需有 tId 通过 attrs 传入）
 */
export default () => {
  const emitter = useTabEmitter()
  const { attrs } = getCurrentInstance() as ComponentInternalInstance
  onUnmounted(() => {
    closeTabLoading()
  })
  /** 显示加载遮罩 */
  const openTabLoading = () => {
    emitter.emit(TabEventType.PAGE_LOADING, { tId: attrs.tId, value: true })
  }

  /** 隐藏加载遮罩 */
  const closeTabLoading = () => {
    emitter.emit(TabEventType.PAGE_LOADING, { tId: attrs.tId, value: false })
  }
  return { openTabLoading, closeTabLoading }
}
