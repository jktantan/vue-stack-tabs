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
      external: ['nuxt/kit', 'vue-stack-tabs', '#app', 'nuxt/app'],
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name
          return name === 'plugin' ? 'runtime/[name].mjs' : '[name].mjs'
        }
      }
    }
  }
})
