import type { App } from 'vue'
// import { createI18n } from 'vue-i18n'
import i18n from './i18n'
import StackTab from './StackTabs.vue'
import tabVersion from './banner'
import IFrame from './iframe.vue'
import useTabLoading from './hooks/useTabLoading'
import useTabRouter from './hooks/useTabRouter'
import useStackTab from './hooks/useStackTab'
import TabHeaderButton from '@/lib/components/TabHeader/TabHeaderButton.vue'
import useTabMitt from '@/lib/hooks/useTabMitt'
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

export { IFrame, useTabLoading, useTabRouter, useStackTab, TabHeaderButton, StackTab }
export default {
  install(Vue: App, options?: { locale: string; messages: any }[]): void {
    tabVersion(import.meta.env.PACKAGE_VERSION)
    Vue.component('VueStackTabs', StackTab).use(useTabMitt).use(i18n().getI18n(options))
  }
}
