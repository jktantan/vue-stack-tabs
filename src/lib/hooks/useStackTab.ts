import { useRouter } from 'vue-router'
import useTabpanel from '../hooks/useTabpanel'
import { throttle } from 'throttle-debounce'
import type { ITabData } from '../model/TabModel'
import { defu } from 'defu'

import { encodeTabInfo } from '../utils/TabIdHelper'
import { uriDecode } from '../utils/UriHelper'
import { ulid } from 'ulid'
import { MittType, useEmitter } from './useTabMitt'
import { nextTick } from 'vue'

let iframePath: string
export default () => {
  const router = useRouter()
  const { active, hasTab, pageShown, reset, canAddTab, renewTab, getTab } = useTabpanel()
  const emitter = useEmitter()
  /**
   * 打开新的TAB页面
   * @param tab
   * @param to
   */
  const openNewTab = throttle(500, (tab: ITabData, renew = false) => {
    return new Promise((resolve, reject) => {
      if (!pageShown.value) {
        reject()
        return
      }
      const tabInfo = defu(tab, {
        refreshable: true,
        closable: true,
        iframe: false
      })
      if (tabInfo.id && renew && hasTab(tabInfo.id!)) {
        renewTab(tab)
        const currentTab = getTab(tab.id!)
        // if current tab is active, then must reload the component of router view for complete remove the cache!!!
        if (currentTab?.active) {
          pageShown.value = false
          nextTick(() => {
            pageShown.value = true
          })
        }
      }
      /**
       * In the function of openNewTab, if the tab already 'ACTIVE' then do nothing.
       */
      if (hasTab(tabInfo.id!) && !renew) {
        emitter.emit(MittType.TAB_ACTIVE, { id: tabInfo.id! })
        // active(tabInfo.id!)
        resolve(tabInfo.id)
        return
      }
      if (!tabInfo.id) {
        tabInfo.id = ulid()
      }
      if (!canAddTab()) {
        reject('Max Size')
        return
      }

      // if (initialed) {
      //   // 增加tab
      //   let activeTab: ITabItem | null = null
      //   for (const tab of unref(tabs)) {
      //     tab.active = false
      //   }
      //   activeTab = {
      //     id: tabInfo.id!,
      //     title: tabInfo.title,
      //     closable: tabInfo.closable!,
      //     refreshable: tabInfo.refreshable!,
      //     iframe: tabInfo.iframe!,
      //     url: tabInfo.iframe ? tab.path : null,
      //     active: true,
      //     pages: new Stack<ITabPage>()
      //   } as ITabItem
      //   addTab(activeTab).finally(() => {
      //     toPage(tab, tabInfo)
      //     resolve(tabInfo.id)
      //   })
      // } else {
      toPage(tab, tabInfo)
      resolve(tabInfo.id)
      // }
    })
  })
  const toPage = (tab: ITabData, tabInfo: any) => {
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
  }
  const setIFramePath = (path: string) => {
    iframePath = path
  }
  const getWrapper = () =>{
    return document.getElementsByClassName('cache-page-wrapper')[0]
  }

  return { openNewTab, setIFramePath, active, reset,getWrapper }
}
