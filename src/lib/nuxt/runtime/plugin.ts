/** Nuxt 客户端插件：自动注册 VueStackTabs 并应用 runtimeConfig 中的 locale 配置 */
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import VueStackTabs from 'vue-stack-tabs'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.vueStackTabs as {
    locale?: string
  }

  nuxtApp.vueApp.use(VueStackTabs, [{ locale: config?.locale ?? 'zh-CN' }])
})
