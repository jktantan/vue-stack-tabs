import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'node:path'

const rootDir = resolve(__dirname, '../..')

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      'vue-stack-tabs': resolve(rootDir, 'src/lib/index.ts'),
      '@': resolve(rootDir, 'src')
    }
  }
})
