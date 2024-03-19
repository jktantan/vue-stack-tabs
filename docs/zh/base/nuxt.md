# NUXT

## 引入组件

**示例：**

`plugins/StackTabs.js` 入口文件

```javascript:line-numbers
// 引用VueStackTabs
import StackTab from 'vue-stack-tabs'
//引入样式
import 'vue-stack-tabs/dist/style.css'

export default defineNuxtPlugin(({ vueApp }) => {
  //注册为全局组件
  vueApp.use(StackTab)
})
```
## 配置IFRAME页面


### IFRAME文件
**示例：**

`components/FakeIFrame.vue`

```vue:line-numbers
<script setup lang="ts">
  import { useTabRouter } from 'vue-stack-tabs'
  useTabRouter()
</script>

<template></template>

<style scoped lang="scss"></style>
```
### Nuxt 配置

`nuxt.config.ts`

```typescript:line-numbers
export default defineNuxtConfig({
  ...
  hooks: {
    'pages:extend'(pages: any) {
      pages.push({
        name: 'iframe',
        path: '/iframe',
        file: '~/components/FakeIFrame.vue'
      })
    }
  },
  ...
})
```
## 应用组件

> 配置参考: [VueStackTabs 配置参数](../more/properties.md)

::: danger
VueStackTabs 仅支持单例模式，请勿在同一个页面中引入多个 VueStackTabs 组件！
* 配置 iframe-path 定义iframe页地址
:::


**布局文件**

`layouts/default.vue`

```vue:line-numbers {5}
<template>
  <div class="app-header">头部</div>
  <div class="app-body">
    <div class="app-side">侧边栏</div>
    <vue-stack-tabs iframe-path="/iframe" />
  </div>
</template>
```
