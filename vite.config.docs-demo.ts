/**
 * 构建独立演示应用，输出到 docs 静态目录，用于 GitHub Pages 部署
 * 产出会放到 docs/.vitepress/dist/demo/，与文档一起部署
 */
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'

const DEMO_BASE = process.env.DOCS_DEMO_BASE || '/vue-stack-tabs/demo/'

export default defineConfig({
  base: DEMO_BASE,
  root: 'docs/.vitepress/demo-app',
  build: {
    outDir: '../dist/demo',
    emptyOutDir: true
  },
  plugins: [vue()],
  resolve: {
    alias: {
      'vue-stack-tabs': fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  }
})
