import { createApp } from 'vue'
import VueStackTabs from 'vue-stack-tabs'
import App from './App.vue'
import { router } from './router'
import { demoMessages, resolveDemoLocale } from './i18n'
import { initDemoTheme } from './theme'
import './styles.css'

// 语言由文档站通过 iframe 的 ?lang= 传入（见 theme/DemoPreview.vue）。
// 同一个 locale 同时驱动库自身的文案（标签栏右键菜单等）与演示界面文案。
const locale = resolveDemoLocale()

// 在挂载前应用主题，避免首屏从浅色闪到深色。
initDemoTheme()

createApp(App)
  .use(router)
  .use(VueStackTabs, [{ locale, messages: demoMessages[locale] }])
  .mount('#app')
