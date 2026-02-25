import { createRouter, createWebHistory } from 'vue-router'
import Layout from './Layout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        { path: '', component: () => import('./pages/Home.vue') },
        { path: 'about', component: () => import('./pages/About.vue') },
        { path: 'detail', component: () => import('./pages/Detail.vue') },
        {
          path: 'iframe',
          component: () => import('vue-stack-tabs').then((m) => m.IFrame)
        }
      ]
    }
  ]
})

export default router
