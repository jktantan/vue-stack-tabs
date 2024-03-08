import { useLoading } from '../components/OverlayLoading'
import { type ComponentInternalInstance, getCurrentInstance, onUnmounted } from 'vue'

export default () => {
  const $loading = useLoading()
  const { attrs } = getCurrentInstance() as ComponentInternalInstance
  let loadingInstance: any | null = null
  onUnmounted(() => {
    closeTabLoading()
  })
  const openTabLoading = () => {
    const container = document.querySelector(`#${attrs.tId}`)
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
