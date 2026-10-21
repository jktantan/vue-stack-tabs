---
layout: home

hero:
  name: Vue Stack Tabs
  text: 标签级的隔离，栈式的导航
  tagline: 基于 Vue Router 的 Vue 3 多标签页方案。每个标签都持有自己的页面实例、缓存和导航栈，不同标签的页面互不干扰。
  image:
    src: /img/logo.svg
    alt: Vue Stack Tabs
  actions:
    - theme: brand
      text: 快速上手
      link: /zh/guide/
    - theme: alt
      text: 在线演示
      link: /zh/demo
    - theme: alt
      text: GitHub
      link: https://github.com/jktantan/vue-stack-tabs

features:
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="6" width="7" height="12" rx="2"/>
        <path d="M14 7h7"/>
        <path d="M14 12h7"/>
        <path d="M14 17h4"/>
      </svg>
    title: 路由级标签页
    details: 每个标签承载自己的一条路由栈，切换标签就是切换一整套页面实例，由 Vue Router 驱动。
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12h12"/>
        <path d="m12 8 4 4-4 4"/>
        <path d="M20 5v14"/>
      </svg>
    title: 标签内前进 / 后退
    details: forward 把页面压入当前标签的栈，backward 出栈并驱逐其缓存，像浏览器历史一样，但以标签为单位。
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="13" height="13" rx="2"/>
        <path d="M8 20h11a2 2 0 0 0 2-2V7"/>
      </svg>
    title: 每标签独立缓存
    details: 同一个组件可以在多个标签里各有一份缓存，互不干扰；关闭标签即驱逐其页面，不会彼此泄漏。
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <path d="M3 9h18"/>
        <path d="M7 13h6"/>
        <path d="M7 16h4"/>
      </svg>
    title: iframe 标签
    details: 把外部页面作为标签嵌入，并通过 postMessage 桥双向通信，甚至可以从 iframe 内部请求打开新标签。
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4v16"/>
        <path d="m8 8 4-4 4 4"/>
        <path d="m8 16 4 4 4-4"/>
      </svg>
    title: 状态与滚动都会保留
    details: 表单输入、组件状态与滚动位置随标签切换保留；浏览器刷新后还能通过会话恢复找回上次激活的标签及其页面栈。
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 4 9 16H3z"/>
        <path d="M8 16h8"/>
      </svg>
    title: Nuxt 3/4 模块
    details: 一个模块注册全局组件并自动导入 composables，也可以按普通 Vue 3 插件的方式接入。
---

## 30 秒接入

::: code-group

```bash [pnpm]
pnpm add vue-stack-tabs
```

```bash [npm]
npm install vue-stack-tabs
```

```bash [yarn]
yarn add vue-stack-tabs
```

:::

```ts
// main.ts
import { createApp } from 'vue'
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'

const app = createApp(App)
app.use(router)
app.use(VueStackTabs)
app.mount('#app')
```

然后在承载标签的父路由里放一个 `<VueStackTabs iframe-path="/iframe" />`，其余交给路由。详见[快速上手](./guide/)。

## 和「一个标签一个 iframe」相比

|          | 每个标签一个 iframe     | vue-stack-tabs                      |
| -------- | ----------------------- | ----------------------------------- |
| 隔离粒度 | 浏览器级，最彻底        | Vue 作用域级，够用且由你掌控        |
| 运行开销 | 每个 iframe 一份运行时  | 共享一份运行时，页面按标签缓存      |
| 组件通信 | 需要 postMessage 序列化 | 直接复用组件、store 与类型          |
| 路由     | 各自独立的 URL 与历史   | 与 Vue Router 同步，栈式前进 / 后退 |
| 样式     | 浏览器天然隔离          | 隔离边界由你决定                    |

当你确实需要文档级隔离（例如嵌入第三方站点）时，可以继续使用 [iframe 标签](./advance/iframe-bridge.md)。

## 接着看

- [快速上手](./guide/) —— 从安装到第一个标签
- [在线演示](./demo) —— 真实应用里的多标签、前进后退与 iframe
- [API 参考](./more/useTabActions.md) —— `useTabActions`、`useTabRouter`、`useTabLoading`
