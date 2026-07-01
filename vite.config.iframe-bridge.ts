import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/lib/iframe-bridge.ts'),
      formats: ['es'],
      fileName: () => 'iframe-bridge.mjs'
    },
    rollupOptions: {
      external: ['vue-router']
    }
  }
})
