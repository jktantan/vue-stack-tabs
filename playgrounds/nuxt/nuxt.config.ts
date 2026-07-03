import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const isSourceMode = process.env.USE_SOURCE === '1'

export default defineNuxtConfig({
  modules: [isSourceMode ? resolve(rootDir, 'src/lib/nuxt/module.ts') : 'vue-stack-tabs/nuxt'],
  vueStackTabs: { locale: 'zh-CN' },
  vite: {
    resolve: {
      alias: isSourceMode
        ? {
            'vue-stack-tabs': resolve(rootDir, 'src/lib/index.ts'),
            '@': resolve(rootDir, 'src')
          }
        : {
            '@': resolve(rootDir, 'src')
          }
    }
  },
  css: [
    isSourceMode
      ? resolve(rootDir, 'src/lib/assets/style/index.scss')
      : 'vue-stack-tabs/dist/style.css'
  ]
})
