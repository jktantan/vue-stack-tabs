import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import DemoPreview from './DemoPreview.vue'
import StackHero from './components/StackHero.vue'
import './demo-preview.css'
import './styles/custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    // 首页 hero 右侧用 CSS 画的「标签栈」示意替换默认图片（见 components/StackHero.vue）
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(StackHero)
    })
  },
  enhanceApp({ app }) {
    // 演示以独立应用 + iframe 的形式提供（见 DemoPreview.vue），
    // 文档站不再注册 vue-stack-tabs 与内存路由，避免与 VitePress 自身路由冲突。
    app.component('DemoPreview', DemoPreview)
  }
}
