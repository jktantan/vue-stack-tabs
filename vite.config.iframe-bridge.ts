import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/lib/iframe-bridge.ts'),
      formats: ['es'],
      fileName: () => 'iframe-bridge.mjs'
    },
    rollupOptions: {
      external: ['vue-router']
    }
  }
})
