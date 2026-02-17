/**
 * vue-stack-tabs - 入口与导出
 *
 * 导出：StackTab（组件）、useTabActions、useTabRouter、useTabLoading、IFrame、TabHeaderButton
 * 安装：Vue.use(plugin) 注册全局组件 VueStackTabs、事件总线、i18n
 */
import type { App } from 'vue'
import i18n from './i18n'
import StackTab from './StackTabs.vue'
import logVersion from './versionLogger'
import IFrame from './iframe.vue'
import useTabLoading from './hooks/useTabLoading'
import useTabRouter from './hooks/useTabRouter'
import useTabActions from './hooks/useTabActions'
import TabHeaderButton from '@/lib/components/TabHeader/TabHeaderButton.vue'
import useTabEventBus from '@/lib/hooks/useTabEventBus'
import './assets/style/index.scss'
//
// const i18n = createI18n({
//   legacy: false,
//   locale: 'zh-CN',
//   fallbackLocale: 'en-US'
// })

export * from './model/TabModel'
// Cutsom type
declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    VueStackTabs: typeof StackTab
  }
}

export {
  IFrame,
  useTabActions,
  useTabLoading,
  useTabRouter,
  TabHeaderButton,
  StackTab
}
export {
  postOpenTab,
  onRefreshRequest,
  MSG_REFRESH,
  MSG_OPEN_TAB
} from './utils/iframeBridge'
export type { IframeOpenTabPayload } from './utils/iframeBridge'
export default {
  install(Vue: App, options?: { locale: string; messages: Record<string, unknown> }[]): void {
    logVersion(import.meta.env.PACKAGE_VERSION)
    Vue.component('VueStackTabs', StackTab).use(useTabEventBus).use(i18n().getI18n(options))
  }
}
