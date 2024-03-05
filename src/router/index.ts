import { createRouter, createWebHistory } from 'vue-router'
import Frame from '@/components/layout/Frame.vue'
const router = createRouter({
  // history: createWebHistory(import.meta.env.BASE_URL),
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/index.vue')
    },
    {
      path: '/demo',
      name: 'demo',
      component: Frame,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/demo/index.vue')
        },
        {
          path: 'test2',
          name: 'test2',
          component: () => import('@/views/demo/test2.vue')
        },
        {
          path: 'iframe',
          name: 'iframe',
          component: () => import('@/lib/iframe.vue')
        }
      ]
    }
  ]
})

export default router
