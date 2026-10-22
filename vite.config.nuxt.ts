import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist/nuxt',
    copyPublicDir: false,
    emptyOutDir: false,
    lib: {
      entry: {
        module: resolve(import.meta.dirname, 'src/lib/nuxt/module.ts'),
        plugin: resolve(import.meta.dirname, 'src/lib/nuxt/runtime/plugin.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      // vue / vue-router / vue-i18n-lite 必须 external：否则插件会内联一份独立的
      // Vue 运行时与 i18n 实例，既增大体积，也让 inject / Symbol key 与库实例不匹配。
      external: [
        'nuxt/kit',
        'nuxt/app',
        '#app',
        'vue',
        'vue-router',
        'vue-i18n-lite',
        'vue-stack-tabs'
      ],
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name
          return name === 'plugin' ? 'runtime/[name].mjs' : '[name].mjs'
        }
      }
    }
  }
})
