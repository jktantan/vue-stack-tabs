import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')

export default defineNuxtConfig({
  // 启用 Nuxt 4 兼容模式
  future: {
    compatibilityVersion: 4
  },
  // 开发阶段默认使用源码模式
  modules: [resolve(rootDir, 'src/lib/nuxt/module.ts')],
  vueStackTabs: { locale: 'zh-CN' },
  vite: {
    resolve: {
      alias: {
        'vue-stack-tabs': resolve(rootDir, 'src/lib/index.ts'),
        '@': resolve(rootDir, 'src')
      }
    }
  },
  css: [resolve(rootDir, 'src/lib/assets/style/index.scss')]
})
