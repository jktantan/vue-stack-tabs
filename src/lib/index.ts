import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import StackTab from './StackTabs.vue'
import tabVersion from './banner'
import IFrame from './iframe.vue'
import useTabLoading from './hooks/useTabLoading'
import useTabRouter from './hooks/useTabRouter'
import useStackTab from './hooks/useStackTab'
import './assets/style/index.scss'
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en-US'
})

export * from './model/TabModel'
export { IFrame, useTabLoading, useTabRouter, useStackTab,StackTab }
export default {
  install(Vue: App): void {
    tabVersion(import.meta.env.PACKAGE_VERSION)
    Vue.component('VueStackTabs', StackTab).use(i18n)
  }
}
