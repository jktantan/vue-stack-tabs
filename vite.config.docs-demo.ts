/**
 * 独立演示应用（docs/.vitepress/demo-app）。
 *
 * 为什么用独立应用而不是在文档里内嵌组件：vue-stack-tabs 管理与浏览器 URL 绑定的
 * 路由与标签栈，直接跑在文档站里会与 VitePress 自身的路由冲突。把它隔离在 iframe 内
 * （见 theme/DemoPreview.vue）既避免冲突，又保留了真实的 URL、前进后退与缓存行为。
 *
 * - 构建：产物输出到 docs/.vitepress/dist/demo-app，随文档一起部署
 * - 开发：`pnpm run docs:dev` 会并行启动本应用的 dev server（默认 5174）
 */
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

/**
 * 演示应用部署路径。
 * 注意：不能叫 `demo/`——文档站的 `docs/demo.md` 会生成 `demo.html`，
 * 静态服务器对 `/demo/` 会优先命中文档页，导致 iframe 里套娃加载自己。
 */
const DEMO_BASE = process.env.DOCS_DEMO_BASE || '/vue-stack-tabs/demo-app/'

export default defineConfig({
  base: DEMO_BASE,
  root: 'docs/.vitepress/demo-app',
  server: {
    // 固定端口：DemoPreview.vue 的 DEV_DEMO_ORIGIN 依赖它。
    // 端口被占用时先执行 `pnpm run clean:ports`。
    port: 5174,
    strictPort: true
  },
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      // 直接引用库源码，改 src/lib 时 demo 热更新
      'vue-stack-tabs': fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  // Vite 8 默认使用 sass 的 modern compiler API，无需再显式设置
  // css.preprocessorOptions.scss.api（该选项已从类型定义中移除）。
  build: {
    // 相对 root（docs/.vitepress/demo-app）解析
    outDir: '../dist/demo-app',
    emptyOutDir: true
  }
})
