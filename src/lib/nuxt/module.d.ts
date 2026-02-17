import type { ModuleOptions } from './module'

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    vueStackTabs: {
      locale: string
    }
  }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    vueStackTabs: {
      locale: string
    }
  }
}

export type { ModuleOptions }
