import { type ComponentInternalInstance, getCurrentInstance, onUnmounted } from 'vue'
import { MittType, useEmitter } from '../hooks/useTabMitt'

export default () => {
  const emitter = useEmitter()
  const { attrs } = getCurrentInstance() as ComponentInternalInstance
  onUnmounted(() => {
    closeTabLoading()
  })
  const openTabLoading = () => {
    emitter.emit(MittType.PAGE_LOADING, { tId: attrs.tId, value: true })
  }

  const closeTabLoading = () => {
    emitter.emit(MittType.PAGE_LOADING, { tId: attrs.tId, value: false })
  }
  return { openTabLoading, closeTabLoading }
}
