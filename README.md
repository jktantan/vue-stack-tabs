# vue-stack-tabs

**中文** | [English](./README.en.md) | [Русский](./README.ru.md)

> Vue 3 多标签页管理库，基于 Vue Router。用 Vue 作用域实现类似 iframe TabPanel 的效果——**每个 Tab 间组件作用域互不干扰**。

## ✨ 特性

- 🗂️ **路由级标签页** — 每个标签拥有独立的组件和缓存
- 📚 **栈式页内导航** — 标签内支持 forward / backward，类似浏览器历史栈
- 🔄 **标签刷新** — 单个刷新或全部刷新，完全重建组件实例
- 🌐 **iframe 标签** — 支持嵌入 iframe 页面，postMessage 通信
- 💾 **Session 持久化** — 浏览器刷新后恢复上次激活的标签
- 📜 **滚动位置记忆** — 切换标签后自动恢复上次滚动位置
- 🎨 **右键菜单** — 内置关闭/刷新操作
- 🌍 **国际化** — 内置中英文，可扩展
- 📦 **Nuxt 3/4 模块** — 开箱即用

---

## 📦 安装

```bash
# npm
npm install vue-stack-tabs

# pnpm
pnpm add vue-stack-tabs
```

---

## 🚀 快速接入（Vue 3）

### 1. 注册插件

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

> `vue-stack-tabs` 每个 Vue app 只支持一个 `<VueStackTabs>` 实例。默认导入 `VueStackTabs` 是 Vue plugin，用于 `app.use(VueStackTabs)`；如果需要本地组件导入，请使用 named export。

### 2. 配置路由

标签页依赖 Vue Router，需要一个承载 `<VueStackTabs>` 的父路由：

```ts
// router.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./Layout.vue'),
      children: [
        { path: '', component: () => import('./pages/Home.vue') },
        { path: 'about', component: () => import('./pages/About.vue') },
        { path: 'settings', component: () => import('./pages/Settings.vue') },
        // iframe 占位路由（必须）
        { path: 'iframe', component: () => import('vue-stack-tabs').then((m) => m.IFrame) }
      ]
    }
  ]
})

export default router
```

### 3. 使用组件

```vue
<!-- Layout.vue -->
<template>
  <div style="width: 100%; height: 100vh">
    <VueStackTabs iframe-path="/iframe" :default-tabs="defaultTabs" :max="20" :contextmenu="true" />
  </div>
</template>

<script setup lang="ts">
import type { ITabData } from 'vue-stack-tabs'

const defaultTabs: ITabData[] = [
  {
    title: '首页',
    path: '/',
    closable: false,
    refreshable: true
  }
]
</script>
```

如果需要本地组件导入，推荐使用 `VueStackTabs` named export；`StackTab` named export 会继续保留作为兼容别名：

```ts
import { VueStackTabs as VueStackTabsComponent } from 'vue-stack-tabs'
```

### 4. 打开标签

```ts
import { useTabActions } from 'vue-stack-tabs'

const { openTab, closeTab, refreshTab } = useTabActions()

// 打开新标签
openTab({
  id: 'about', // 可选，不传则自动生成
  title: '关于',
  path: '/about',
  query: { id: '1' } // 可选
})

// 关闭标签
closeTab('about')

// 刷新标签
refreshTab('about')
```

---

## 🚀 快速接入（Nuxt 3/4）

### 1. 注册模块

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: {
    locale: 'zh-CN'
  },
  css: ['vue-stack-tabs/dist/style.css']
})
```

### 2. 在 Layout 中使用

```vue
<!-- layouts/default.vue -->
<template>
  <div style="width: 100%; height: 100vh">
    <VueStackTabs iframe-path="/iframe" :default-tabs="defaultTabs" />
  </div>
</template>

<script setup lang="ts">
import type { ITabData } from 'vue-stack-tabs'

const defaultTabs: ITabData[] = [{ title: '首页', path: '/', closable: false, refreshable: true }]
</script>
```

### 3. 页面中使用

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>首页</h1>
    <button @click="openTab({ title: '关于', path: '/about' })">打开关于页</button>
  </div>
</template>

<script setup>
import { useTabActions } from 'vue-stack-tabs'
const { openTab } = useTabActions()
</script>
```

---

## ESM-only 与 iframe bridge 子入口

`vue-stack-tabs` 从当前版本开始只承诺 ESM import，不再支持 `require('vue-stack-tabs')`。

主应用中继续使用 root 入口：

```ts
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'
```

iframe 内部页面建议使用无样式副作用的子入口：

```ts
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

postOpenTab(
  { title: '订单详情', path: '/orders/1' },
  { targetOrigin: 'https://parent.example.com' }
)

const off = onRefreshRequest(() => window.location.reload(), {
  allowedOrigins: ['https://parent.example.com']
})
```

默认未传 `targetOrigin` 时使用 iframe 页面自身的 `window.location.origin`，适合同源父页面；跨域父页面必须显式传 `targetOrigin`。生产环境建议同时显式传入 `targetOrigin` 和 `allowedOrigins`。

---

## iframe 安全策略

`VueStackTabs` 支持配置 iframe 安全属性：

```vue
<VueStackTabs
  iframe-path="/__iframe"
  iframe-sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-same-origin"
  iframe-referrer-policy="strict-origin-when-cross-origin"
  iframe-allow="fullscreen"
  :iframe-load-timeout="15000"
/>
```

默认 sandbox 保留常见业务页面能力，属于兼容优先，不是强隔离；强隔离请移除 `allow-same-origin`，并按业务能力继续减少 sandbox token。如果你的同源业务页面确实不能在 sandbox 下工作，可以传入空字符串关闭 sandbox，但这会降低隔离强度。

---

## 📖 API 参考

### useTabActions

标签级操作封装。

```ts
import { useTabActions } from 'vue-stack-tabs'

const {
  openTab, // (tab: ITabData, renew?: boolean) => Promise<string>
  closeTab, // (id: string) => string
  closeAllTabs, // () => void
  refreshTab, // (id: string) => void
  refreshAllTabs, // () => void
  activeTab, // (id: string, isRoute?: boolean) => void
  reset, // () => void
  tabs // Ref<ITabItem[]>
} = useTabActions()
```

| 方法                   | 说明                                                      |
| ---------------------- | --------------------------------------------------------- |
| `openTab(tab, renew?)` | 打开新标签。`renew=true` 时若已存在则清空页面栈后重新打开 |
| `closeTab(id)`         | 关闭指定标签，返回新激活的标签 ID                         |
| `closeAllTabs()`       | 关闭所有可关闭标签                                        |
| `refreshTab(id)`       | 刷新指定标签（替换缓存 ID，重建组件实例）                   |
| `refreshAllTabs()`     | 刷新所有标签                                              |
| `activeTab(id)`        | 激活指定标签（切换 Tab）                                  |
| `reset()`              | 关闭所有标签并重置状态                                    |

---

### useTabRouter

标签内栈式导航，**只能在标签内的页面组件中使用**。

```ts
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScrollTarget } = useTabRouter()
```

| 方法                        | 说明                              |
| --------------------------- | --------------------------------- |
| `forward(to)`               | 在当前标签内前进到新页面          |
| `backward(to, backQuery?)`  | 在当前标签内后退                  |
| `addScrollTarget(selector)` | 注册需要记忆滚动位置的 DOM 选择器 |

#### forward

```ts
// 前进到 /detail 页面
forward({ path: '/detail', query: { id: '123' } })

// 循环压栈自身（同路由可多次入栈，每次创建独立缓存）
forward({ path: '/list', query: { page: '2' } })
```

#### backward

```ts
// 后退 1 步（默认）
backward(1)

// 后退 N 步
backward(3)

// 回退到指定路径（自动从栈中查找）
backward('/list')

// 带参回退（目标页通过 props._back 接收）
backward('/list', { result: 'success', data: { id: 1 } })
```

**目标页接收参数：**

```vue
<script setup>
// 声明 props 接收后退参数
defineProps<{ _back?: { result: string; data: any } }>()
</script>
```

---

### useTabLoading

页面加载状态控制，**只能在标签内的页面组件中使用**。

```ts
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

// 显示加载遮罩
openTabLoading()

// 异步操作完成后关闭
fetchData().finally(() => closeTabLoading())
```

> 组件卸载时自动关闭 Loading，无需手动清理。

---

## ⚙️ Props

`<VueStackTabs>` 组件属性：

| Prop                   | 类型                        | 默认值                                                                     | 说明                                                    |
| ---------------------- | --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| `iframePath`           | `string`                    | **必填**                                                                   | iframe 占位路由的路径                                   |
| `iframeSandbox`        | `string`                    | `allow-scripts allow-forms allow-popups allow-downloads allow-same-origin` | iframe sandbox 策略；默认兼容优先不是强隔离，强隔离请移除 `allow-same-origin`；传空字符串可关闭 sandbox（不推荐） |
| `iframeReferrerPolicy` | `ReferrerPolicy`            | `strict-origin-when-cross-origin`                                          | iframe referrerpolicy 属性                              |
| `iframeAllow`          | `string`                    | `''`                                                                       | iframe allow 属性，例如 `fullscreen`                    |
| `iframeLoadTimeout`    | `number`                    | `15000`                                                                    | iframe 加载超时时间，单位 ms                            |
| `defaultTabs`          | `ITabData[]`                | `[]`                                                                       | 初始标签列表                                            |
| `max`                  | `number`                    | `20`                                                                       | 最大标签数量                                            |
| `contextmenu`          | `boolean \| object`         | `true`                                                                     | 是否启用右键菜单                                        |
| `pageTransition`       | `string`                    | `'stack-tab-swap'`                                                         | 前进时的页面转场动画名                                  |
| `pageTransitionBack`   | `string`                    | `'stack-tab-swap-back'`                                                    | 后退时的页面转场动画名                                  |
| `tabTransition`        | `string \| TransitionProps` | `'stack-tab-zoom'`                                                         | 标签增删时的过渡效果                                    |
| `tabScrollMode`        | `TabScrollMode`             | `'both'`                                                                   | 标签栏滚动方式：`'wheel'` / `'button'` / `'both'`       |
| `width`                | `string`                    | `'100%'`                                                                   | 容器宽度                                                |
| `height`               | `string`                    | `'100%'`                                                                   | 容器高度                                                |
| `i18n`                 | `string`                    | `'zh-CN'`                                                                  | 国际化语言                                              |
| `globalScroll`         | `boolean`                   | `false`                                                                    | 是否使用页面级滚动记忆                                  |
| `sessionPrefix`        | `string`                    | `''`                                                                       | sessionStorage 键前缀                                   |
| `iframeAllowedOrigins` | `string[]`                  | 同源                                                                       | 允许 iframe postMessage 的来源列表                      |

---

## 🎯 Events

| 事件           | 参数           | 说明                   |
| -------------- | -------------- | ---------------------- |
| `onActive`     | `(id: string)` | 标签被激活时触发       |
| `onPageLoaded` | —              | 页面组件加载完成时触发 |

---

## 🖼️ iframe 标签页

### 打开 iframe 标签

```ts
openTab({
  title: '外部页面',
  path: 'https://example.com',
  iframe: true
})
```

### iframe 页面内操作

在 iframe 标签页内，可以通过 `postMessage` 与宿主容器进行通信，实现打开新标签或响应刷新操作。

#### 1. 使用 Bridge 工具（推荐）

如果 iframe 内页能引用库代码，推荐使用无样式副作用的 `vue-stack-tabs/iframe-bridge` 子入口：

```ts
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

const parentOrigin = 'https://parent.example.com'

// 打开标签
postOpenTab(
  {
    title: '新页面',
    path: '/detail',
    query: { id: '1' }
  },
  { targetOrigin: parentOrigin }
)

// 监听刷新请求
const off = onRefreshRequest(
  () => {
    // 自定义刷新逻辑
    location.reload()
  },
  { allowedOrigins: [parentOrigin] }
)
```

#### 2. 原生对接方式

如果无法引入库工具，或希望保持零依赖，可以使用原生 API。生产环境必须使用明确的父页面 origin，并校验刷新消息来源。`postOpenTab` 的默认 `targetOrigin` 是 iframe 页面的 `window.location.origin`，跨域父页面必须显式传入父页面 origin：

```ts
const parentOrigin = 'https://parent.example.com'

// 打开标签
window.parent.postMessage(
  {
    type: 'vue-stack-tabs:openTab',
    payload: {
      title: '原生新页面',
      path: '/detail'
    }
  },
  parentOrigin
)

// 监听刷新请求
window.addEventListener('message', (ev) => {
  if (ev.origin !== parentOrigin) return
  if (ev.source !== window.parent) return
  if (ev.data?.type === 'vue-stack-tabs:refresh') {
    // 执行刷新
    location.reload()
  }
})
```

### iframe 刷新模式

在 `openTab` 时可通过 `iframeRefreshMode` 指定刷新行为：

- `postMessage`（默认）：宿主向 iframe 发送 `vue-stack-tabs:refresh` 消息，由内页自行决定如何刷新（动画更丝滑）。
- `reload`：宿主直接重置 iframe 的 `src` 或 `key` 触发浏览器强制重载（适用于跨域或无法修改代码的页面）。

---

## 🌍 国际化

内置语言：`zh-CN`（中文）、`en-US`（英文）。

```ts
// 切换语言
app.use(VueStackTabs, [{ locale: 'en-US' }])
```

自定义语言包：

```ts
app.use(VueStackTabs, [
  {
    locale: 'ja-JP',
    messages: {
      'VueStackTab.close': '閉じる',
      'VueStackTab.refresh': '更新'
      // ...
    }
  }
])
```

---

## 📄 类型定义

```ts
/** 打开标签时传入的数据 */
interface ITabData {
  id?: string // 标签 ID（不传则自动生成 UUID）
  title: string // 标签标题
  path: string // 路由路径或 iframe URL
  query?: Record<string, string> // 路由参数
  closable?: boolean // 是否可关闭（默认 true）
  refreshable?: boolean // 是否可刷新（默认 true）
  iframe?: boolean // 是否为 iframe 标签（默认 false）
  iframeRefreshMode?: 'postMessage' | 'reload' // iframe 刷新方式
}

/** 标签栏滚动模式 */
enum TabScrollMode {
  WHEEL = 'wheel',
  BUTTON = 'button',
  BOTH = 'both'
}
```

---

## 📁 项目结构

```
src/lib/
├── StackTabs.vue           # 主组件
├── index.ts                # 入口与导出
├── hooks/                  # 核心逻辑
│   ├── useTabActions.ts    # 对外 API
│   ├── useTabRouter.ts     # 栈内导航
│   ├── useTabLoading.ts    # Loading 状态
│   └── useTabPanel.tsx     # 核心引擎
├── model/TabModel.ts       # 类型定义
├── components/             # UI 组件
├── nuxt/                   # Nuxt 模块
└── assets/style/           # 样式
```

详细架构设计请参阅 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

---

## 📝 License

[LGPL-2.1](./LICENSE)
