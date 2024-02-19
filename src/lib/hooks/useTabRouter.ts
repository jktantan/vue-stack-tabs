import { defu } from 'defu'

import { getCurrentInstance } from 'vue'
import type {ComponentInternalInstance} from 'vue'
import { useRoute as orgRoute, useRouter as orgRouter } from 'vue-router'
import { ElLoading } from 'element-plus'

import { encodeTabid } from '../utils/TabIdHelper'
import type { TabData, TabRouteLocationRaw } from '../model/TabModel'
import useTabEvent from '../hooks/useTabEvent'

export const useTabRouter = () => {
  const { attrs } = getCurrentInstance() as ComponentInternalInstance
  const { backward: tabBackward, routerAlive } = useTabEvent()
  const route = orgRoute()
  const router = orgRouter()
  let currentId = ''
  // const currentPageId = ''
  let currentTab = ''

  currentId = attrs.tId as string
  // currentPageId = attrs.pId as string
  currentTab = route.query.__tab as string

  const forward = (to: TabRouteLocationRaw) => {
    routerAlive.value = false
    const query = defu(
      {
        __tab: currentTab
      },
      to.query
    )
    router.push({
      path: to.path,
      query
    })
  }
  /**
   * 返回
   * @param to 要返回的地址或者返回几步
   * @param query 返回时要加截的数据
   */
  const backward = (to: number | string, query?: Object) => {
    tabBackward(currentId, to, query)
  }

  return {
    forward,
    backward
  }
}

/**
 * 打开新的TAB页面
 * @param tab
 * @param to
 */
export const useTab = () => {
  const router = useRouter()
  const { active, routerAlive, routerLeaved, reset } = useTabEvent()
  const openTab = useThrottle((tab: TabData, to: TabRouteLocationRaw | string) => {
    if (!(routerAlive.value && routerLeaved.value)) {
      return
    }
    const tabInfo = defu(tab, { closable: true, iframe: false })
    if (active(tabInfo.id)) {
      return
    }
    const __tab = encodeTabid(tabInfo)
    let path: string
    let query: Object | undefined
    if (typeof to === 'string') {
      path = to
      query = {}
    } else {
      path = to.path
      query = to.query
    }
    const fullQuery = defu(
      {
        __tab
      },
      query
    )
    router.push({
      path,
      query: fullQuery
    })
  }, 500)

  const openIframeTab = (tab: TabData, to: TabRouteLocationRaw | string) => {
    const tabInfo = defu(tab, { closable: true, iframe: true })
    if (active(tabInfo.id)) {
      return
    }
    const __tab = encodeTabid(tabInfo)
    const __src = encodeURIComponent(tab.src as string)
    let path: string
    let query: Object | undefined
    if (typeof to === 'string') {
      path = to
      query = {}
    } else {
      path = to.path
      query = to.query
    }
    const fullQuery = defu(
      {
        __tab,
        __src
      },
      query
    )
    router.push({
      path,
      query: fullQuery
    })
  }

  return { openTab, openIframeTab, reset }
}
export const useTabLoading = () => {
  let loadingInstance: any = null
  const openLoading = () => {
    if (loadingInstance === null) {
      loadingInstance = ElLoading.service({
        target: '.cache-page-wrapper'
      })
    }
  }

  const closeLoading = () => {
    if (loadingInstance !== null) {
      loadingInstance.close()
      loadingInstance = null
    }
  }
  return { openLoading, closeLoading }
}
