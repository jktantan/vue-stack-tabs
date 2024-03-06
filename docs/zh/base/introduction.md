# 入门

## 引入组件

**示例：**

`main.js` 入口文件

```javascript {5,6,14}
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

> 配置参考: [StackTabs 配置参数](../../api/README.md#routertab-配置参数)

::: danger
StackTabs 仅支持单例模式，请勿在同一个页面中引入多个 StackTabs 组件！
:::

**示例：**

`components/layout/Frame.vue` 布局框架

```html {5}
<template>
  <div class="app-header">头部</div>
  <div class="app-body">
    <div class="app-side">侧边栏</div>
    <vue-stack-tabs />
  </div>
</template>
```

## 路由配置

引入 StackTabs 内置路由以支持 [Iframe 页签](iframe.md)

::: warning
StackTabs 所在父路由必须提供能访问的默认路由，您可以通过两种方式实现：

1. 配置 `redirect` 重定向到子路由
2. 默认访问路由与父路由路径保持一致。(示例采用当前方案)

:::

**示例：**

`router.js` 路由

```javascript {5,8,17,19,21,23,25,38,39,40,41,42,43}
import Vue from 'vue'
import Router from 'vue-router'

// RouterTab 内置路由
import { RouterTabRoutes } from 'vue-router-tab'

// 引入布局框架组件
import Frame from './components/layout/Frame.vue'

// 异步加载页面组件
const importPage = view => () =>
  import(/* webpackChunkName: "p-[request]" */ `./views/${view}.vue`)

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      // 父路由组件内必须包含 <router-tab>
      component: Frame,
      // 子路由里配置需要通过页签打开的页面路由
      children: [
        // 引入 RouterTab 内置路由以支持 Iframe 页签
        ...RouterTabRoutes,
        {
          path: '/', // 默认页和父级路由一致
          name: 'Home',
          component: importPage('Home'),
          meta: {
            title: '首页' // 页签标题
          }
        },
        {
          path: '/page/:id',
          component: importPage('Page'),
          meta: {
            title: '页面', // 页签标题
            icon: 'icon-user', // 页签图标，可选
            tabClass: 'custom-tab', // 自定义页签 class，可选
            tips: '这是一个页面', // 页签提示，可选，如未设置则跟 title 一致
            key: 'path', // 路由打开页签规则，可选
            closable: false // 页签是否允许关闭，默认 `true`
          }
        },
        {
          path: '/404',
          component: importPage('404'),
          meta: {
            title: '找不到页面',
            icon: 'icon-page'
          }
        }
      ]
    },
    {
      // 其他路由 404
      path: '*',
      redirect: '/404'
    }
  ]
})
```