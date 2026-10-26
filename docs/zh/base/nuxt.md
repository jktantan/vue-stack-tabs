# NUXT

## 方式一：使用 Nuxt 模块（推荐）

在 `nuxt.config.ts` 中配置模块：

```typescript
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: {
    locale: 'zh-CN', // 内置可选 'zh-CN' | 'en'
    // 内置语言包之外的语言在这里补充，格式与插件选项一致
    messages: [
      {
        locale: 'zh-TW',
        messages: {
          VueStackTab: {
            close: '關閉',
            closeLeft: '關閉左側',
            closeAll: '關閉所有'
          }
        }
      }
    ]
  }
})
```

`messages` 会与内置语言包合并，未提供的键回退到内置 `zh-CN` / `en`。
模块只负责在安装时注册语言包；运行时切换语言仍通过
`<VueStackTabs :i18n="...">` 传入当前 locale。

模块会自动完成以下配置：

- 注册 VueStackTabs 组件
- 自动导入 `useTabActions`、`useTabRouter`、`useTabLoading` 等 composables
- 把 `locale` 与 `messages` 传给 vue-stack-tabs 内部 i18n 实例

## 方式二：手动引入插件

`plugins/StackTabs.js` 入口文件

```javascript:line-numbers
// 引用 VueStackTabs 插件
import VueStackTabs from 'vue-stack-tabs'
//引入样式
import 'vue-stack-tabs/dist/style.css'

export default defineNuxtPlugin(({ vueApp }) => {
  //注册为全局组件
  vueApp.use(VueStackTabs)
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

- 配置 iframe-path 定义iframe页地址
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
