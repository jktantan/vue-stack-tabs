import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist/nuxt',
    emptyOutDir: false,
    lib: {
      entry: {
        module: resolve(__dirname, 'src/lib/nuxt/module.ts'),
        plugin: resolve(__dirname, 'src/lib/nuxt/runtime/plugin.ts')
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.mjs`
    },
    rollupOptions: {
      external: ['nuxt/kit', 'vue-stack-tabs', '#app', 'nuxt/app']
    }
  }
})
