import { type ComponentInternalInstance, getCurrentInstance, onUnmounted } from 'vue'
import {useEmitter} from '@/lib/hooks/useTabMitt'

export default () => {
  const emitter = useEmitter()
  const { attrs } = getCurrentInstance() as ComponentInternalInstance
  onUnmounted(() => {
    closeTabLoading()
  })
  const openTabLoading = () => {
    emitter.emit("loading", { tId:attrs.tId,value:true })
  }

  const closeTabLoading = () => {
    emitter.emit("loading",{ tId:attrs.tId,value:false })
  }
  return { openTabLoading, closeTabLoading }
}
