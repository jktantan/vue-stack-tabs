import { fileURLToPath, URL } from 'node:url'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import loadVersion from 'vite-plugin-package-version'
import { resolve } from 'path'
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vueJsx(),
    loadVersion(),
    dts({ insertTypesEntry: true, tsconfigPath: 'tsconfig.lib.json' })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : []
    // drop: ['console','debugger']
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'vue-stack-tabs',
      fileName: (format) => `vue-stack-tabs.${format}.js`
    },
    rollupOptions: {
      external: ['vue', 'element-plus', 'vue-router'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          'vue-router': 'vueRouter'
        }
      }
    }
  }
}))
