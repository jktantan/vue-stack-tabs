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
          path: 'page1',
          name: 'page1',
          component: () => import('@/views/test_cases/Page1.vue')
        },
        {
          path: 'page2',
          name: 'page2',
          component: () => import('@/views/test_cases/Page2.vue')
        },
        {
          path: 'page3',
          name: 'page3',
          component: () => import('@/views/test_cases/Page3.vue')
        },
        {
          path: 'page4',
          name: 'page4',
          component: () => import('@/views/test_cases/Page4.vue')
        },
        {
          path: 'page5',
          name: 'page5',
          component: () => import('@/views/test_cases/Page5.vue')
        },
        {
          path: 'internal',
          component: () => import('@/views/test_cases/InternalRouteHome.vue')
        },
        {
          path: 'internal/detail',
          component: () => import('@/views/test_cases/InternalRouteDetail.vue')
        },
        {
          path: 'internal/cross',
          component: () => import('@/views/test_cases/InternalRouteCross.vue')
        },
        {
          path: 'opener',
          component: () => import('@/views/test_cases/TabOpener.vue')
        },
        {
          path: 'url-test/home',
          component: () => import('@/views/test_cases/url_test/Home.vue')
        },
        {
          path: 'url-test/a',
          component: () => import('@/views/test_cases/url_test/A.vue')
        },
        {
          path: 'url-test/b',
          component: () => import('@/views/test_cases/url_test/B.vue')
        },
        {
          path: 'multi-tab',
          component: () => import('@/views/test_cases/SameRouteMultiTab.vue')
        },
        {
          path: 'loading-test',
          component: () => import('@/views/test_cases/LoadingTest.vue')
        },
        {
          path: 'dynamic-title',
          component: () => import('@/views/test_cases/DynamicTitle.vue')
        },
        {
          path: 'scroll',
          component: () => import('@/views/test_cases/ScrollTest.vue')
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
          path: ':pathMatch(.*)*',
          name: 'NotFound',
          component: () => import('@/views/404.vue')
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
