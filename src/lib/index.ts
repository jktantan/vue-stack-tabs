import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import StackTab from './StackTabs.vue'
// import VueEmttier from './hooks/useMitt'
import tabVersion from './banner'
// import './assets/style/index.scss'
// import 'vue-loading-overlay/dist/css/index.css'
import IFrame from './iframe.vue'
import useTabLoading from './hooks/useTabLoading'
import useTabRouter from './hooks/useTabRouter'
import useStackTab from './hooks/useStackTab'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en-US'
})
export { IFrame, useTabLoading, useTabRouter, useStackTab }
export * from './model/TabModel'
export default {
  install(app: App): void {
    tabVersion(import.meta.env.PACKAGE_VERSION)
    app.component('VueStackTabs', StackTab).use(i18n)
  }
}
