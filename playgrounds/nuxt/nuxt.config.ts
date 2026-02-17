import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const useSource = process.env.USE_SOURCE === '1' || process.env.USE_SOURCE === 'true'

export default defineNuxtConfig(
  useSource
    ? {
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
      }
    : {
        modules: ['vue-stack-tabs/nuxt'],
        vueStackTabs: { locale: 'zh-CN' },
        css: ['vue-stack-tabs/dist/vue-stack-tabs.css']
      }
)