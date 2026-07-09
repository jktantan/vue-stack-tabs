/**
 * vue-stack-tabs - 入口与导出
 *
 * 导出：StackTab（组件）、useTabActions、useTabRouter、useTabLoading、IFrame、TabHeaderButton
 * 安装：Vue.use(plugin) 注册全局组件 VueStackTabs、事件总线、i18n
 */
import type { App } from 'vue'
import i18n, { type LocaleMessageOption } from './i18n'
import StackTab from './StackTabs.vue'
import logVersion from './versionLogger'
import { createStackTabsRuntimeContext, stackTabsContextKey } from './hooks/stackTabsContext'
import { tabEmitterKey } from './hooks/useTabEventBus'
import IFrame from './iframe.vue'
import useTabLoading from './hooks/useTabLoading'
import useTabRouter from './hooks/useTabRouter'
import useTabActions from './hooks/useTabActions'
import TabHeaderButton from './components/TabHeader/TabHeaderButton.vue'
import './assets/style/index.scss'

export type VueStackTabsPluginOptions = LocaleMessageOption[]

export * from './model/TabModel'
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
  StackTab,
  StackTab as VueStackTabs
}
export { postOpenTab, onRefreshRequest, MSG_REFRESH, MSG_OPEN_TAB } from './utils/iframeBridge'
export type { IframeOpenTabPayload } from './utils/iframeBridge'
export default {
  install(Vue: App, options?: VueStackTabsPluginOptions): void {
    logVersion(import.meta.env.PACKAGE_VERSION)
    const runtimeContext = createStackTabsRuntimeContext()
    Vue.provide(stackTabsContextKey, runtimeContext)
    Vue.provide(tabEmitterKey, runtimeContext.eventBus)
    Vue.component('VueStackTabs', StackTab).use(i18n().getI18n(options))
  }
}
