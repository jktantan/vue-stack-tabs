import VueStackTabs from 'vue-stack-tabs'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.vueStackTabs as {
    locale?: string
  }

  nuxtApp.vueApp.use(VueStackTabs, {
    locale: config?.locale ?? 'zh-CN'
  })
})
