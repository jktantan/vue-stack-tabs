import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'node:path'

const rootDir = resolve(__dirname, '../..')
const isSourceMode = process.env.USE_SOURCE === '1'

export default defineConfig({
  plugins: [vue(), vueJsx()],
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
})
