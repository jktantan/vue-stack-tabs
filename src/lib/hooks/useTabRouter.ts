import { defu } from 'defu'

import { getCurrentInstance } from 'vue'
import type { ComponentInternalInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { TabRouteLocationRaw } from '../model/TabModel'
import useTabEvent from '../hooks/useTabEvent'

export const useTabRouter = () => {
  const { attrs } = getCurrentInstance() as ComponentInternalInstance
  const { backward: tabBackward, routerAlive } = useTabEvent()
  const route = useRoute()
  const router = useRouter()
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
