import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/lib/**/*.{ts,tsx}'],
      exclude: [
        'src/lib/**/*.spec.{ts,tsx}',
        'src/lib/**/*.d.ts',
        'src/lib/i18n/**',
        'src/lib/versionLogger.ts',
        'src/lib/nuxt/**'
      ]
    }
  }
})
