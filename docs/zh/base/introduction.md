# 入门

## 引入组件

**示例：**

`main.js` 入口文件

```javascript:line-numbers {5,6,14}
// router-tab 组件依赖 vue 
import { createApp } from 'vue'

// 引入组件和样式
import StackTabs from 'vue-stack-tabs'
import 'vue-stack-tab/dist/lib/vue-stack-tabs.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)
app.use(VueStackTabs)

app.mount('#app')
```

## 应用组件

> 配置参考: [VueStackTabs 配置参数](../more/properties.md)

::: danger
VueStackTabs 仅支持单例模式，请勿在同一个页面中引入多个 VueStackTabs 组件！
* 配置 iframe-path 定义iframe页地址
:::

**示例：**

```html:line-numbers {5}
<template>
  <div class="app-header">头部</div>
  <div class="app-body">
    <div class="app-side">侧边栏</div>
    <vue-stack-tabs iframe-path="/iframe" />
  </div>
</template>
```

## 路由配置

需要配置**iframe**路由以支持**Iframe 页签**
::: danger
iframe路由地址需要与组件的 **iframe-path** 一致
:::
**示例：**

`router.js` 路由

```javascript:line-numbers {16,25,26,27}
import { createRouter, createWebHistory } from 'vue-router'
// 引入布局框架组件
import Frame from '@/components/layout/Frame.vue'
import { IFrame } from 'vue-stack-tabs'
// 异步加载页面组件
const importPage = view => () =>
  import(`@/views/${view}.vue`)

const router = createRouter({
  // history: createWebHistory(import.meta.env.BASE_URL),
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      // 父路由组件内必须包含 <router-tab>
      component: Frame,
      children: [
        {
          path: '',
          name: 'home',
          component: () => importPage('home')
        },
        // 配置IFRAME地址
        {
          path: 'iframe',
          name: 'iframe',
          component: IFrame
        },
        // 404地址
        {
          path:'404',
          component: () => importPage('404')
        },
        // 其他路由就跳404
        {
          path: ':pathMatch(.*)',
          redirect:'/404',
        }
      ]
    },
  ]
})
```