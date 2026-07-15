/**
 * vue-stack-tabs Nuxt 模块。
 *
 * 自动注册客户端插件、注入 composables（useTabActions 等），
 * 并通过 runtimeConfig 传递 locale 配置。
 */
import { addPlugin, addImports, createResolver, defineNuxtModule } from 'nuxt/kit'

export interface ModuleOptions {
  /** 默认语言 */
  locale?: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'vue-stack-tabs',
    configKey: 'vueStackTabs'
  },
  defaults: {
    locale: 'zh-CN'
  },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.vueStackTabs = {
      locale: options.locale
    }

    addPlugin({
      src: resolve('./runtime/plugin')
    })

    addImports([
      { name: 'useTabActions', from: 'vue-stack-tabs' },
      { name: 'useTabRouter', from: 'vue-stack-tabs' },
      { name: 'useTabLoading', from: 'vue-stack-tabs' }
    ])
  }
})
