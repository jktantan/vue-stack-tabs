import { useRouter } from 'vue-router'
import useTabEvent from '@/lib/hooks/useTabEvent'
import { throttle } from 'lodash-es'
import type { ITabData } from '@/lib/model/TabModel'
import { defu } from 'defu'
import { encodeTabInfo } from '@/lib/utils/TabIdHelper'
import * as path from 'path'

export default () => {
  const router = useRouter()
  const { active, routerAlive, routerLeaved, reset } = useTabEvent()
  let iframePath: string

  /**
   * 打开新的TAB页面
   * @param tab
   * @param to
   */
  const openNewTab = throttle((tab: ITabData) => {
    if (!(routerAlive.value && routerLeaved.value)) {
      return
    }
    const tabInfo = defu(tab, { refreshable: true, closable: true, iframe: false })

    /**
     * In the function of openNewTab, if the tab already 'ACTIVE' then do nothing.
     */
    if (active(tabInfo.id!)) {
      return
    }
    const __tab = encodeTabInfo(tabInfo)
    const query = defu(
      {
        __tab
      },
      tab.query
    ) as Record<string, string>
    let path
    if (tab.iframe) {
      path = tab.path
    } else {
      const __src = encodeURIComponent(tab.path as string)
      path = iframePath
      query['__src'] = __src
    }

    router.push({
      path,
      query
    })
  }, 500)

  const setIFramePath = (path: string) => {
    iframePath = path
  }

  return { openNewTab, setIFramePath, active, reset }
}
