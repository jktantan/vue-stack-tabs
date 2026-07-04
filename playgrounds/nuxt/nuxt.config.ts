import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')
const isPackageMode = process.env.USE_PACKAGE === '1'

export default defineNuxtConfig({
  modules: [isPackageMode ? 'vue-stack-tabs/nuxt' : resolve(rootDir, 'src/lib/nuxt/module.ts')],
  vueStackTabs: { locale: 'zh-CN' },
  vite: {
    resolve: {
      alias: isPackageMode
        ? {
            '@': resolve(rootDir, 'src')
          }
        : {
            'vue-stack-tabs': resolve(rootDir, 'src/lib/index.ts'),
            '@': resolve(rootDir, 'src')
          }
    }
  },
  css: [
    isPackageMode
      ? 'vue-stack-tabs/dist/style.css'
      : resolve(rootDir, 'src/lib/assets/style/index.scss')
  ]
})
