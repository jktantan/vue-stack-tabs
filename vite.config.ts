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
    port: 8086
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
  // optimizeDeps: {
  //   include: [
  //     'element-plus',
  //     '@floating-ui/dom',
  //     '@floating-ui/core',
  //     '@floating-ui/utils',
  //     '@floating-ui/utils/dom',
  //     '@popperjs/core',
  //     '@vueuse/core',
  //     '@vueuse/shared',
  //     '@ctrl/tinycolor',
  //     'async-validator',
  //     'normalize-wheel-es',
  //     'memoize-one',
  //     'lodash-es',
  //     '@vue/devtools-kit',
  //     '@vue/devtools-shared',
  //     'hookable',
  //     'birpc',
  //     'perfect-debounce',
  //   ]
  // }
}))
