import { useLoading } from 'vue-loading-overlay'
import type { ActiveLoader } from 'vue-loading-overlay'

const $loading = useLoading()
export default () => {
  let loadingInstance: ActiveLoader | null = null
  const openTabLoading = () => {
    if (loadingInstance === null) {
      loadingInstance = $loading.show({
        canCancel: false,
        isFullPage: false,
        height: 85,
        width: 85,
        loader: 'spinner',
        color: '#007bff',

        container: document.getElementsByClassName('cache-page-wrapper')[0]
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
