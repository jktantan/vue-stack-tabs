import { createRouter, createWebHistory } from 'vue-router'
import Frame from '@/components/layout/Frame.vue'

import { IFrame } from '@/lib'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes: [
    {
      path: '/',
      component: () => import('@/views/index.vue')
    },
    {
      path: '/other',
      component: () => import('@/views/other.vue')
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
          path: 'subroute',
          name: 'subroute',
          component: () => import('@/views/demo/subroute/Test2Layout.vue'),
          children: [
            {
              path: '',
              name: 'subroute-home',
              component: () => import('@/views/demo/subroute/Test2SubHome.vue')
            },
            {
              path: 'detail',
              name: 'subroute-detail',
              component: () => import('@/views/demo/subroute/Test2SubDetail.vue')
            },
            {
              path: 'detail/:id',
              name: 'subroute-detail-id',
              component: () => import('@/views/demo/subroute/Test2SubDetail.vue')
            }
          ]
        },
        {
          path: 'test3',
          name: 'test3',
          component: () => import('@/views/demo/test3.vue')
        },
        {
          path: 'test4/:id',
          name: 'test4',
          component: () => import('@/views/demo/test3.vue')
        },
        {
          path: 'iframe',
          name: 'iframe',
          component: IFrame
        },
        {
          path: '404',
          name: '404',
          component: () => import('@/views/404.vue')
        },
        {
          path: ':pathMatch(.*)',
          redirect: '/demo/404'
        }
      ]
    },
    {
      path: '/404',
      name: '404',
      component: Frame,
      children: [
        {
          path: '',
          name: '404home',
          component: () => import('@/views/404.vue')
        }
      ]
    }
  ]
})

export default router
