import { useRouter } from 'vue-router'
import useTabpanel from '../hooks/useTabpanel'
import { throttle } from 'lodash-es'
import type { ITabData } from '../model/TabModel'
import { defu } from 'defu'
import { encodeTabInfo } from '../utils/TabIdHelper'
import { uriDecode } from '../utils/UriHelper'
import { ulid } from 'ulidx'
let iframePath: string
export default () => {
  const router = useRouter()
  const { active, hasTab, pageShown, reset,canAddTab } = useTabpanel()

  /**
   * 打开新的TAB页面
   * @param tab
   * @param to
   */
  const openNewTab = throttle((tab: ITabData) => {
    return new Promise((resolve, reject)=>{
      if(!canAddTab()){
        reject()
        return
      }
      if (!pageShown.value) {
        reject()
        return
      }
      const tabInfo = defu(tab, { refreshable: true, closable: true, iframe: false })

      /**
       * In the function of openNewTab, if the tab already 'ACTIVE' then do nothing.
       */
      if (hasTab(tabInfo.id!)) {
        active(tabInfo.id!)
        resolve(tabInfo.id)
        return
      }
      if (!tabInfo.id) {
        tabInfo.id = ulid()
      }
      const __tab = encodeTabInfo(tabInfo)
      let query = defu(
        {
          __tab
        },
        tab.query
      ) as Record<string, string>
      let path
      if (!tab.iframe) {
        const url = uriDecode(tab.path)
        path = url.path
        query = defu(url.query, query)
      } else {
        const __src = encodeURIComponent(tab.path as string)
        path = iframePath
        query['__src'] = __src
      }


      router.push({
        path,
        query
      })
      resolve(tabInfo.id)
    })

  }, 500)

  const setIFramePath = (path: string) => {
    iframePath = path
  }

  return { openNewTab, setIFramePath, active, reset }
}
