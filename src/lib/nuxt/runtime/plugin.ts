/**
 * Nuxt 客户端插件：自动注册 VueStackTabs 并应用 runtimeConfig 中的 locale / messages 配置。
 */
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import VueStackTabs from 'vue-stack-tabs'
import { applyStackTabsLocale } from '../../i18n/stackTabsLocale'
import type { LocaleMessageOption } from '../../i18n'
import { useI18n, type I18n } from 'vue-i18n-lite'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.vueStackTabs as {
    locale?: string
    messages?: LocaleMessageOption[]
  }
  const locale = config?.locale ?? 'zh-CN'

  // 第一项的 locale 决定内部 i18n 的初始语言；后续项只合并 messages。
  nuxtApp.vueApp.use(VueStackTabs, [{ locale }, ...(config?.messages ?? [])])

  // 兜底：应用 vue-stack-tabs 内部 i18n 实例的 locale 切换逻辑，
  // 避免某些场景下 plugin options 未能正确初始化时 locale 仍是默认 zh-CN。
  //
  // 必须在 app 的注入上下文中取实例：插件顶层直接 inject() 拿不到 app.provide 的值。
  nuxtApp.vueApp.runWithContext(() => {
    const i18n = useI18n() as I18n | undefined
    if (i18n?.changeLocale) applyStackTabsLocale(i18n.changeLocale, locale)
  })
})
