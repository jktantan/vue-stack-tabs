# Vue Stack Tabs

[![npm version](https://img.shields.io/npm/v/vue-stack-tabs.svg)](https://www.npmjs.com/package/vue-stack-tabs)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

A multi-tab management library for Vue 3 and Vue Router. Each tab has its own component stack with isolated scope, suitable for admin dashboards, multi-tab workspaces, and similar scenarios.

基于 Vue 3 和 Vue Router 的多标签页管理库。每个标签拥有独立的组件栈，作用域互不干扰，适合后台管理、多页签工作台等场景。

---

## Table of Contents / 目录

- [Features / 特性](#features--特性)
- [Installation / 安装](#installation--安装)
- [Quick Start / 快速开始](#quick-start--快速开始)
- [Props / 属性](#props--属性)
- [API](#api)
- [Nuxt](#nuxt)
- [iframe & PostMessage](#iframe--postmessage)
- [i18n / 国际化](#i18n--国际化)
- [Sub-routes / 子路由](#sub-routes-experimental--子路由试验性)
- [完整中文说明](#完整中文说明)
- [License / 许可证](#license--许可证)

---

## Features / 特性

- **Route-based & iframe tabs** — Tab pages from Vue Router routes or embedded iframes
- **Tab operations** — Add, close, refresh, batch close (all / left / right / others)
- **Stack navigation** — Forward / backward within a tab
- **Scroll position** — Remember and restore scroll per page
- **Session recovery** — Restore last active tab on refresh
- **Nuxt 3/4 module** — Official Nuxt integration

---

## Installation / 安装

```bash
pnpm add vue-stack-tabs
# or
npm install vue-stack-tabs
```

**Peer dependencies:** Vue 3, Vue Router 5.x

---

## Quick Start / 快速开始

### Vue

```ts
// main.ts
import { createApp } from 'vue'
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(VueStackTabs)
app.mount('#app')
```

```vue
<!-- App.vue or layout -->
<template>
  <vue-stack-tabs iframe-path="/iframe" />
</template>
```

Configure the iframe route to match `iframe-path` (see [Route config](#route-config--路由配置)).

### Route Config / 路由配置

The parent route must wrap `<vue-stack-tabs>`, and the iframe path route must be registered.

```ts
// router.ts
import { createRouter, createWebHistory } from 'vue-router'
import Frame from '@/components/layout/Frame.vue'
import { IFrame } from 'vue-stack-tabs'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Frame,  // contains <vue-stack-tabs>
      children: [
        { path: '', component: () => import('@/views/home.vue') },
        { path: 'iframe', component: IFrame },  // must match iframe-path
        { path: ':pathMatch(.*)', redirect: '/404' }
      ]
    }
  ]
})
```

---

## Props / 属性

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultTabs` | `ITabData[]` | `[]` | Initial tabs |
| `max` | `number` | `20` | Max open tabs |
| `iframePath` | `string` | — | iframe route path **(required)** |
| `iframeAllowedOrigins` | `string[]` | `[]` | Origins allowed for postMessage `openTab` |
| `pageTransition` | `string` | `stack-tab-swap` | Page transition name |
| `tabTransition` | `string` | `stack-tab-zoom` | Tab transition name |
| `tabScrollMode` | `'wheel' \| 'button' \| 'both'` | `both` | Tab bar scroll mode |
| `width` / `height` | `string` | `100%` | Component size |
| `i18n` | `string` | `zh-CN` | Locale (`zh-CN` \| `en`) |
| `space` | `number` | `300` | Tab scroll step (px) |
| `globalScroll` | `boolean` | `false` | Use page-level scroll |
| `contextmenu` | `boolean \| object` | `true` | Right-click menu |
| `sessionPrefix` | `string` | `''` | Prefix for sessionStorage key |

---

## API

### useTabActions

```ts
import { useTabActions } from 'vue-stack-tabs'

const {
  openTab,
  closeTab,
  closeAllTabs,
  refreshTab,
  refreshAllTabs,
  activeTab,
  reset,
  tabs,
  openInNewWindow
} = useTabActions()
```

| Method | Description |
|--------|-------------|
| `openTab(tab, renew?)` | Open tab. `renew=true` clears stack and reopens |
| `closeTab(id)` | Close tab |
| `closeAllTabs()` | Close all tabs |
| `refreshTab(id)` | Refresh current page of tab |
| `refreshAllTabs()` | Refresh all tabs |
| `activeTab(id, isRoute?)` | Activate tab |
| `reset()` | Reset all tabs |
| `openInNewWindow(id)` | Open iframe tab in new window (fallback) |

**openTab(tab: ITabData)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | No | Tab id (auto-generated if omitted) |
| `title` | `string` | Yes | Tab title |
| `path` | `string` | Yes | Route path or iframe URL |
| `query` | `Record<string, string>` | No | Query params |
| `iframe` | `boolean` | No | Open as iframe |
| `iframeRefreshMode` | `'postMessage' \| 'reload'` | No | iframe refresh mode |
| `closable` | `boolean` | No | Default `true` |
| `refreshable` | `boolean` | No | Default `true` |

### useTabRouter

Used **inside tab pages** for in-tab navigation.

```ts
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScrollTarget } = useTabRouter()

// Forward: push new page
forward({ path: '/detail', query: { id: '1' } })

// Backward: pop stack
backward('/list')           // back to first matching path
backward(1)                 // back 1 step
backward(2, { foo: 'bar' }) // back 2 steps, pass query to target

// Register scroll containers for position restore
addScrollTarget('.scroll-area', '#panel')
```

### useTabLoading

```ts
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()
```

### Initial Tabs / 初始化页签

```vue
<vue-stack-tabs
  iframe-path="/iframe"
  :default-tabs="[
    { id: 'home', title: 'Home', path: '/', closable: false },
    { title: 'About', path: '/about' }
  ]"
/>
```

> The first tab should be non-closable (`closable: false`).

---

## Nuxt

### Module (recommended)

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: {
    locale: 'zh-CN'
  }
})
```

The module auto-imports `useTabActions`, `useTabRouter`, `useTabLoading`.

### iframe route in Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  hooks: {
    'pages:extend'(pages) {
      pages.push({
        name: 'iframe',
        path: '/iframe',
        file: '~/components/IFrame.vue'  // minimal component with useTabRouter()
      })
    }
  }
})
```

---

## iframe & PostMessage

### Open tab from iframe

```ts
import { postOpenTab } from 'vue-stack-tabs'

postOpenTab({
  title: 'New Page',
  path: '/detail',
  query: { id: '123' },
  closable: true,
  refreshable: true
})
```

Parent must allow the iframe origin if cross-origin:

```vue
<vue-stack-tabs
  iframe-path="/iframe"
  :iframe-allowed-origins="['https://iframe-origin.com']"
/>
```

### Receive refresh in iframe

```ts
import { onRefreshRequest } from 'vue-stack-tabs'
import { onUnmounted } from 'vue'

const unlisten = onRefreshRequest()  // defaults to location.reload()
onUnmounted(unlisten)
```

### Cross-origin iframe (reload mode)

When the iframe is cross-origin and you cannot modify its code:

```ts
openTab({
  title: 'External',
  path: 'https://example.com',
  iframe: true,
  iframeRefreshMode: 'reload'
})
```

---

## i18n / 国际化

Built-in: `zh-CN`, `en`.

```vue
<vue-stack-tabs iframe-path="/iframe" i18n="zh-CN" />
```

### Custom messages

```ts
app.use(VueStackTabs, [{
  locale: 'zh-CN',
  messages: {
    VueStackTab: {
      close: 'Close',
      closeLefts: 'Close left',
      closeRights: 'Close right',
      closeOthers: 'Close others',
      closeAll: 'Close all',
      reload: 'Reload',
      reloadAll: 'Reload all',
      maximum: 'Maximize',
      restore: 'Restore',
      undefined: 'Undefined',
      loading: 'Loading',
      openInNewWindow: 'Open in new window'
    }
  }
}])
```

---

## Slots

| Slot | Description |
|------|-------------|
| `leftButton` | Left side of tab bar |
| `rightButton` | Right side of tab bar |

---

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `onActive` | `id: string` | Fired when a tab is activated |
| `onPageLoaded` | — | Fired when page component is loaded |

---

## Exports

```ts
import VueStackTabs, {
  useTabActions,
  useTabRouter,
  useTabLoading,
  TabHeaderButton,
  IFrame,
  postOpenTab,
  onRefreshRequest,
  MSG_REFRESH,
  MSG_OPEN_TAB
} from 'vue-stack-tabs'
import type { ITabData, ITabBase, IframeOpenTabPayload } from 'vue-stack-tabs'
```

---

## Sub-routes (Experimental / 子路由试验性)

Nested routes with `children` and `forward`/`backward` are supported. See [SUBROUTE_EXPERIMENTAL.md](./docs/SUBROUTE_EXPERIMENTAL.md) for details. This feature is experimental.

---

## Development / 开发

```bash
pnpm install
pnpm run dev        # Demo app
pnpm run test       # Unit tests
pnpm run test:prepack   # Pre-pack: unit + Vue + Nuxt (source)
pnpm run test:packaged # Post-pack: Vue + Nuxt (dist)
pnpm run docs:dev   # Docs preview
```

See [CONTRIBUTING.md](./CONTRIBUTING.md). [AGENTS.md](./AGENTS.md) for AI assistants.

---

## 完整中文说明

### 安装与引入

```ts
// main.ts
import { createApp } from 'vue'
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(VueStackTabs)
app.mount('#app')
```

**依赖：** Vue 3、Vue Router 5.x

### 快速开始

```vue
<!-- App.vue 或布局组件 -->
<template>
  <vue-stack-tabs iframe-path="/iframe" />
</template>
```

父路由需包裹 `<vue-stack-tabs>`，并注册与 `iframe-path` 一致的 iframe 路由。

### 路由配置

```ts
// router.ts
import { createRouter, createWebHistory } from 'vue-router'
import Frame from '@/components/layout/Frame.vue'
import { IFrame } from 'vue-stack-tabs'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Frame,  // 内部包含 <vue-stack-tabs>
      children: [
        { path: '', component: () => import('@/views/home.vue') },
        { path: 'iframe', component: IFrame },  // 需与 iframe-path 一致
        { path: ':pathMatch(.*)', redirect: '/404' }
      ]
    }
  ]
})
```

### 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `defaultTabs` | `ITabData[]` | `[]` | 初始页签 |
| `max` | `number` | `20` | 最大打开数量 |
| `iframePath` | `string` | — | iframe 路由路径 **（必填）** |
| `iframeAllowedOrigins` | `string[]` | `[]` | 允许 postMessage 调用 openTab 的 iframe 来源 |
| `pageTransition` | `string` | `stack-tab-swap` | 页面转场效果 |
| `tabTransition` | `string` | `stack-tab-zoom` | 标签转场效果 |
| `tabScrollMode` | `'wheel' \| 'button' \| 'both'` | `both` | 标签栏滚动方式 |
| `width` / `height` | `string` | `100%` | 组件尺寸 |
| `i18n` | `string` | `zh-CN` | 语言（`zh-CN` \| `en`） |
| `space` | `number` | `300` | 标签滚动步长（px） |
| `globalScroll` | `boolean` | `false` | 是否使用页面级滚动 |
| `contextmenu` | `boolean \| object` | `true` | 右键菜单 |
| `sessionPrefix` | `string` | `''` | sessionStorage key 前缀 |

### API

#### useTabActions

```ts
import { useTabActions } from 'vue-stack-tabs'

const {
  openTab,
  closeTab,
  closeAllTabs,
  refreshTab,
  refreshAllTabs,
  activeTab,
  reset,
  tabs,
  openInNewWindow
} = useTabActions()
```

| 方法 | 说明 |
|------|------|
| `openTab(tab, renew?)` | 打开标签；`renew=true` 时清空栈并重新打开 |
| `closeTab(id)` | 关闭指定标签 |
| `closeAllTabs()` | 关闭所有标签 |
| `refreshTab(id)` | 刷新指定标签当前页 |
| `refreshAllTabs()` | 刷新所有标签 |
| `activeTab(id, isRoute?)` | 激活指定标签 |
| `reset()` | 重置所有标签 |
| `openInNewWindow(id)` | iframe 标签在新窗口打开（无法嵌入时降级） |

**openTab(tab: ITabData)**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | 否 | 标签 id，不填则自动生成 |
| `title` | `string` | 是 | 标签名称 |
| `path` | `string` | 是 | 路由路径或 iframe URL |
| `query` | `Record<string, string>` | 否 | 查询参数 |
| `iframe` | `boolean` | 否 | 是否以 iframe 打开 |
| `iframeRefreshMode` | `'postMessage' \| 'reload'` | 否 | iframe 刷新方式 |
| `closable` | `boolean` | 否 | 默认 `true` |
| `refreshable` | `boolean` | 否 | 默认 `true` |

#### useTabRouter

在**标签内的页面**中使用，用于标签内前进/后退。

```ts
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScrollTarget } = useTabRouter()

// 前进：入栈新页面
forward({ path: '/detail', query: { id: '1' } })

// 后退：出栈
backward('/list')           // 回退到首个匹配路径
backward(1)                 // 回退 1 步
backward(2, { foo: 'bar' }) // 回退 2 步，并向目标页传递 query

// 注册滚动容器（用于位置记忆与恢复）
addScrollTarget('.scroll-area', '#panel')
```

#### useTabLoading

```ts
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()
```

#### 初始化页签

```vue
<vue-stack-tabs
  iframe-path="/iframe"
  :default-tabs="[
    { id: 'home', title: '首页', path: '/', closable: false },
    { title: '关于', path: '/about' }
  ]"
/>
```

> 第一个页签建议设为不可关闭（`closable: false`）。

### Nuxt

#### 模块方式（推荐）

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: {
    locale: 'zh-CN'
  }
})
```

模块会自动导入 `useTabActions`、`useTabRouter`、`useTabLoading`。

#### Nuxt 中配置 iframe 路由

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  hooks: {
    'pages:extend'(pages) {
      pages.push({
        name: 'iframe',
        path: '/iframe',
        file: '~/components/IFrame.vue'  // 最小组件，含 useTabRouter() 即可
      })
    }
  }
})
```

### iframe 与父窗口通信

#### iframe 内打开新标签

```ts
import { postOpenTab } from 'vue-stack-tabs'

postOpenTab({
  title: '新页面',
  path: '/detail',
  query: { id: '123' },
  closable: true,
  refreshable: true
})
```

跨域时父应用需配置 `iframeAllowedOrigins`：

```vue
<vue-stack-tabs
  iframe-path="/iframe"
  :iframe-allowed-origins="['https://iframe来源域名']"
/>
```

#### iframe 内接收刷新指令

```ts
import { onRefreshRequest } from 'vue-stack-tabs'
import { onUnmounted } from 'vue'

const unlisten = onRefreshRequest()  // 默认执行 location.reload()
onUnmounted(unlisten)
```

#### 跨域 iframe（reload 模式）

若 iframe 为跨域且无法修改其代码，可指定 `iframeRefreshMode: 'reload'`，刷新时直接重载 iframe：

```ts
openTab({
  title: '外部页面',
  path: 'https://example.com',
  iframe: true,
  iframeRefreshMode: 'reload'
})
```

### 国际化

内置 `zh-CN`、`en`。

```vue
<vue-stack-tabs iframe-path="/iframe" i18n="zh-CN" />
```

#### 自定义文案

```ts
app.use(VueStackTabs, [{
  locale: 'zh-CN',
  messages: {
    VueStackTab: {
      close: '关闭',
      closeLefts: '关闭左侧',
      closeRights: '关闭右侧',
      closeOthers: '关闭其他',
      closeAll: '关闭全部',
      reload: '刷新',
      reloadAll: '刷新全部',
      maximum: '最大化',
      restore: '还原',
      undefined: '未定义',
      loading: '加载中',
      openInNewWindow: '新窗口打开'
    }
  }
}])
```

### 插槽

| 插槽 | 说明 |
|------|------|
| `leftButton` | 标签栏左侧 |
| `rightButton` | 标签栏右侧 |

### 事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `onActive` | `id: string` | 标签被激活时触发 |
| `onPageLoaded` | — | 页面组件加载完成时触发 |

### 导出

```ts
import VueStackTabs, {
  useTabActions,
  useTabRouter,
  useTabLoading,
  TabHeaderButton,
  IFrame,
  postOpenTab,
  onRefreshRequest,
  MSG_REFRESH,
  MSG_OPEN_TAB
} from 'vue-stack-tabs'
import type { ITabData, ITabBase, IframeOpenTabPayload } from 'vue-stack-tabs'
```

### 子路由（试验性）

支持路由 `children` 与 `forward`/`backward` 多级导航。详见 [SUBROUTE_EXPERIMENTAL.md](./docs/SUBROUTE_EXPERIMENTAL.md)。该功能为试验性。

### 开发

```bash
pnpm install
pnpm run dev           # 演示应用
pnpm run test          # 单元测试
pnpm run test:prepack  # 打包前：单元 + Vue + Nuxt（源码）
pnpm run test:packaged # 打包后：Vue + Nuxt（dist）
pnpm run docs:dev      # 文档预览
```

参见 [CONTRIBUTING.md](./CONTRIBUTING.md)。[AGENTS.md](./AGENTS.md) 供 AI 助手参考。

---

## License / 许可证

Apache License 2.0
