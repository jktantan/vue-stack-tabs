/**
 * Nuxt 模块类型声明。
 * 扩展 PublicRuntimeConfig 以支持 vueStackTabs 配置的类型推导。
 */
import type { ModuleOptions } from './module'
import type { LocaleMessageOption } from '../i18n'

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    vueStackTabs: {
      locale: string
      messages: LocaleMessageOption[]
    }
  }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    vueStackTabs: {
      locale: string
      messages: LocaleMessageOption[]
    }
  }
}

export type { ModuleOptions }
