/**
 * vue-stack-tabs Nuxt 模块。
 *
 * 自动注册客户端插件、注入 composables（useTabActions 等）、
 * 注册全局组件 <VueStackTabs>，并通过 runtimeConfig 传递 locale 配置。
 */
import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule } from 'nuxt/kit'
import type { LocaleMessageOption } from '../i18n'

export interface ModuleOptions {
  /** 默认语言 */
  locale?: string
  /**
   * 额外语言包，格式与插件选项一致。
   *
   * 内置只有 zh-CN / en；需要其他语言时在这里补充，模块会把它们
   * 与 { locale } 一起传给 VueStackTabs 插件。运行时仍可通过
   * <VueStackTabs :i18n="..."> 切换语言。
   */
  messages?: LocaleMessageOption[]
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
      locale: options.locale,
      messages: options.messages ?? []
    }

    addPlugin({
      src: resolve('./runtime/plugin')
    })

    // 自动注册全局组件 <VueStackTabs>，使用方无需在每个页面再 import。
    addComponent({
      name: 'VueStackTabs',
      export: 'VueStackTabs',
      // 指向发布产物（dist/vue-stack-tabs.es.js）中的命名导出；
      // 源码入口 ../index.ts 不会被发布，Nuxt 构建时会解析失败。
      filePath: resolve('../vue-stack-tabs.es.js')
    })

    addImports([
      { name: 'useTabActions', from: 'vue-stack-tabs' },
      { name: 'useTabRouter', from: 'vue-stack-tabs' },
      { name: 'useTabLoading', from: 'vue-stack-tabs' }
    ])
  }
})
