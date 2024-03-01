import { createRouter, createWebHistory } from 'vue-router'
import Frame from '@/components/layout/Frame.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Frame,
      children: [
        {
          path: '/',
          name: 'home',
          component: () => import('@/views/index.vue')
        }
      ]
    }
  ]
})

export default router
