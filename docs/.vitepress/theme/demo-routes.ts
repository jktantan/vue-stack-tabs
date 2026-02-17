// Demo 路由配置
import DemoHome from './components/demo-pages/DemoHome.vue'
import DemoAbout from './components/demo-pages/DemoAbout.vue'
import DemoContact from './components/demo-pages/DemoContact.vue'
import DemoPage from './components/demo-pages/DemoPage.vue'
import DemoScroll from './components/demo-pages/DemoScroll.vue'
import DemoForm from './components/demo-pages/DemoForm.vue'
import DemoNested from './components/demo-pages/DemoNested.vue'
import DemoDynamic from './components/demo-pages/DemoDynamic.vue'

export const demoRoutes = [
  {
    path: '/demo-home',
    component: DemoHome
  },
  {
    path: '/demo-about',
    component: DemoAbout
  },
  {
    path: '/demo-contact',
    component: DemoContact
  },
  {
    path: '/demo-page/:id',
    component: DemoPage
  },
  {
    path: '/demo-scroll',
    component: DemoScroll
  },
  {
    path: '/demo-form',
    component: DemoForm
  },
  {
    path: '/demo-nested',
    component: DemoNested
  },
  {
    path: '/demo-dynamic/:num',
    component: DemoDynamic
  }
]
