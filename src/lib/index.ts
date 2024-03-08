import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import StackTab from './StackTabs.vue'
import tabVersion from './banner'
import IFrame from './iframe.vue'
import useTabLoading from './hooks/useTabLoading'
import useTabRouter from './hooks/useTabRouter'
import useStackTab from './hooks/useStackTab'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en-US'
})
const install = (app: App): void => {
  tabVersion(import.meta.env.PACKAGE_VERSION)
  app.component('VueStackTabs', StackTab).use(i18n)
}

export * from './model/TabModel'
export { IFrame, useTabLoading, useTabRouter, useStackTab, install }
