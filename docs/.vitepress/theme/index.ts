import DefaultTheme from 'vitepress/theme'
import { createRouter, createMemoryHistory } from 'vue-router'
import VueStackTabs from '../../../src/lib/index'
import '../../../src/lib/assets/style/stackTab.scss'
import DemoPreview from './DemoPreview.vue'
import FullDemo from './components/FullDemo.vue'
import { demoRoutes } from './demo-routes'
import './demo-preview.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 创建一个内存路由用于 Demo
    const demoRouter = createRouter({
      history: createMemoryHistory(),
      routes: demoRoutes
    })
    
    // 注册 VueStackTabs 插件
    app.use(demoRouter)
    app.use(VueStackTabs, [{
      locale: 'zh-CN',
      messages: {
        VueStackTab: {
          close: '关闭 / Close',
          closeLeft: '关闭左侧 / Close Left',
          closeRight: '关闭右侧 / Close Right',
          closeOthers: '关闭其他 / Close Others',
          closeAll: '关闭全部 / Close All',
          reload: '刷新 / Reload',
          reloadAll: '刷新全部 / Reload All',
          maximum: '最大化 / Maximize',
          restore: '还原 / Restore',
          undefined: '未定义 / Undefined',
          loading: '加载中... / Loading...'
        }
      }
    }])
    
    // 注册组件
    app.component('DemoPreview', DemoPreview)
    app.component('FullDemo', FullDemo)
    app.component('DemoTest', () => import('./components/DemoTest.vue'))
  }
}
