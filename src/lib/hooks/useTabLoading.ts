import { useLoading } from 'vue-loading-overlay'
import type { ActiveLoader } from 'vue-loading-overlay'
import { type ComponentInternalInstance, getCurrentInstance, onUnmounted } from 'vue'

export default () => {
  const $loading = useLoading()
  const { attrs } = getCurrentInstance() as ComponentInternalInstance
  let loadingInstance: ActiveLoader | null = null
  onUnmounted(() => {
    closeTabLoading()
  })
  const openTabLoading = () => {
    const container = document.querySelector(`#${attrs.tId}`)
    // const wrappers = document.getElementsByClassName('cache-page-wrapper')
    // for(const wrapper of wrappers){
    //   const childs = wrapper.children
    //   for(const child of childs){
    //     if(child.getAttribute("tId")===attrs.tId){
    //       container=wrapper
    //       break;
    //     }
    //   }
    //   if(container!==null){
    //     break;
    //   }
    // }
    if (loadingInstance === null) {
      loadingInstance = $loading.show({
        canCancel: false,
        isFullPage: false,
        height: 85,
        width: 85,
        loader: 'spinner',
        color: '#007bff',

        container: container!
      })
    }
  }

  const closeTabLoading = () => {
    if (loadingInstance !== null) {
      loadingInstance.hide()
      loadingInstance = null
    }
  }
  return { openTabLoading, closeTabLoading }
}
