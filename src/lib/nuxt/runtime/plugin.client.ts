/**
 * Nuxt 客户端插件：自动注册 VueStackTabs 并应用 runtimeConfig 中的 locale 配置。
 * 与 plugin.ts 内容一致，保留两份以兼容已有构建产物。
 */
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import VueStackTabs from 'vue-stack-tabs'
import { applyStackTabsLocale } from '../../i18n/stackTabsLocale'
import { useI18n } from 'vue-i18n-lite'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.vueStackTabs as {
    locale?: string
  }
  const locale = config?.locale ?? 'zh-CN'

  // Vue.use 时把 locale 作为 plugin options 传入，让 i18n 实例按指定 locale 初始化。
  nuxtApp.vueApp.use(VueStackTabs, [{ locale }])

  // 兜底：应用 vue-stack-tabs 内部 i18n 实例的 locale 切换逻辑，
  // 避免某些场景下 plugin options 未能正确初始化时 locale 仍是默认 zh-CN。
  const { changeLocale } = useI18n()
  applyStackTabsLocale(changeLocale, locale)
})
