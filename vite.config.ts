import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import loadVersion from 'vite-plugin-package-version'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 5173
  },
  plugins: [
    vue(),
    vueJsx(),
    loadVersion(),
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : []
    // drop: ['console','debugger']
  }
}))
