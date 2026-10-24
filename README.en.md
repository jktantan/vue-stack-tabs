# vue-stack-tabs

[![npm version](https://img.shields.io/npm/v/vue-stack-tabs.svg)](https://www.npmjs.com/package/vue-stack-tabs)
[![npm downloads](https://img.shields.io/npm/dm/vue-stack-tabs.svg)](https://www.npmjs.com/package/vue-stack-tabs)
[![license](https://img.shields.io/npm/l/vue-stack-tabs.svg)](./LICENSE)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/vue-stack-tabs)](https://bundlephobia.com/package/vue-stack-tabs)
[![docs](https://img.shields.io/badge/docs-GitHub%20Pages-377dff)](https://jktantan.github.io/vue-stack-tabs/)

[中文](./README.md) | **English** | [Русский](./README.ru.md)

**📖 [Docs](https://jktantan.github.io/vue-stack-tabs/) · 🎮 [Live demo](https://jktantan.github.io/vue-stack-tabs/demo.html)**

> A Vue 3 multi-tab manager built on Vue Router. It delivers iframe-like tab isolation through independent Vue scopes: every tab keeps its own page instance, cache, and navigation stack.

## Features

- **Route-level tabs** — each tab owns independent components and cache
- **Stack-based in-tab navigation** — forward / backward within a tab, similar to browser history stack
- **Tab refresh** — refresh single or all tabs with full component instance rebuild
- **iframe tabs** — embed iframe pages with postMessage communication
- **Session persistence** — restore last active tabs after browser refresh
- **Scroll position memory** — automatically restore scroll position when switching tabs
- **Context menu** — built-in close/refresh actions
- **Slots** — tab bar left/right buttons, custom iframe loading/error placeholders
- **i18n** — built-in Chinese & English, extensible
- **Nuxt 3/4 module** — works out of the box

---

## Installation

```bash
# npm
npm install vue-stack-tabs

# pnpm
pnpm add vue-stack-tabs
```

---

## Quick Start (Vue 3)

### 1. Register Plugin

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

> `vue-stack-tabs` supports only one `<VueStackTabs>` instance per Vue app. The default export is a Vue plugin for `app.use(VueStackTabs)`; if you need a local component import, use the named export below.

### 2. Configure Routes

Tabs depend on Vue Router. You need a parent route to host `<VueStackTabs>`:

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
        // iframe placeholder route (required)
        { path: 'iframe', component: () => import('vue-stack-tabs').then((m) => m.IFrame) }
      ]
    }
  ]
})

export default router
```

### 3. Use Component

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
    title: 'Home',
    path: '/',
    closable: false,
    refreshable: true
  }
]
</script>
```

If you prefer a local component import, use the `VueStackTabs` named export; the `StackTab` named export is kept as a compatibility alias:

```ts
import { VueStackTabs as VueStackTabsComponent } from 'vue-stack-tabs'
```

### 4. Open Tabs

```ts
import { useTabActions } from 'vue-stack-tabs'

const { openTab, closeTab, refreshTab } = useTabActions()

// Open a new tab
openTab({
  id: 'about', // optional, auto-generated if omitted
  title: 'About',
  path: '/about',
  query: { id: '1' } // optional
})

// Close a tab
closeTab('about')

// Refresh a tab
refreshTab('about')
```

---

## Quick Start (Nuxt 3/4)

### 1. Register Module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: {
    locale: 'en' // built-in options: 'zh-CN' | 'en'
  },
  css: ['vue-stack-tabs/dist/style.css']
})
```

### 2. Use in Layout

```vue
<!-- layouts/default.vue -->
<template>
  <div style="width: 100%; height: 100vh">
    <VueStackTabs iframe-path="/iframe" :default-tabs="defaultTabs" />
  </div>
</template>

<script setup lang="ts">
import type { ITabData } from 'vue-stack-tabs'

const defaultTabs: ITabData[] = [{ title: 'Home', path: '/', closable: false, refreshable: true }]
</script>
```

### 3. Use in Pages

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Home</h1>
    <button @click="openTab({ title: 'About', path: '/about' })">Open About Page</button>
  </div>
</template>

<script setup>
import { useTabActions } from 'vue-stack-tabs'
const { openTab } = useTabActions()
</script>
```

---

## ESM-only and iframe bridge sub-entry

`vue-stack-tabs` only supports ESM import from the current version onward; `require('vue-stack-tabs')` is no longer supported.

Main application continues to use the root entry:

```ts
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'
```

For iframe inner pages, use the side-effect-free sub-entry:

```ts
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

postOpenTab(
  { title: 'Order Detail', path: '/orders/1' },
  { targetOrigin: 'https://parent.example.com' }
)

const off = onRefreshRequest(() => window.location.reload(), {
  allowedOrigins: ['https://parent.example.com']
})
```

When `targetOrigin` is not provided, the iframe page's own `window.location.origin` is used by default, suitable for same-origin parent pages; cross-origin parent pages must explicitly pass `targetOrigin`. In production, it is recommended to explicitly pass both `targetOrigin` and `allowedOrigins`.

---

## iframe Security Policy

`VueStackTabs` supports configuring iframe security attributes:

```vue
<VueStackTabs
  iframe-path="/__iframe"
  iframe-sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-same-origin"
  iframe-referrer-policy="strict-origin-when-cross-origin"
  iframe-allow="fullscreen"
  :iframe-load-timeout="15000"
/>
```

The default sandbox retains common business page capabilities and is compatibility-first, not strict isolation. For strict isolation, remove `allow-same-origin` and continue reducing sandbox tokens per business needs. If your same-origin business pages cannot work under sandbox, you can pass an empty string to disable sandbox, but this reduces isolation strength.

---

## API Reference

### useTabActions

Tab-level operation composable.

```ts
import { useTabActions } from 'vue-stack-tabs'

const {
  openTab, // (tab: ITabData, renew?: boolean) => Promise<string | undefined>
  closeTab, // (id: string) => string
  closeAllTabs, // () => void
  refreshTab, // (id: string) => void
  refreshAllTabs, // () => void
  activeTab, // (id: string, isRoute?: boolean) => void
  moveTab, // (id: string, targetIndex: number) => boolean
  reset, // () => void
  tabs, // Ref<ITabItem[]>
  setIFramePath, // (path: string) => void
  getWrapper, // ({ tabId?, pageId? }) => HTMLElement | undefined
  openInNewWindow // (id: string) => void
} = useTabActions()
```

| Method                            | Description                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `openTab(tab, renew?)`            | Open a new tab. When `renew=true`, clears page stack and reopens if exists                                                           |
| `closeTab(id)`                    | Close the specified tab, returns newly activated tab ID                                                                              |
| `closeAllTabs()`                  | Close all closable tabs                                                                                                              |
| `refreshTab(id)`                  | Refresh the specified tab (replaces cache ID, rebuilds component instance)                                                           |
| `refreshAllTabs()`                | Refresh all tabs                                                                                                                     |
| `activeTab(id)`                   | Activate the specified tab (switch tab)                                                                                              |
| `moveTab(id, targetIndex)`        | Move a tab to a given index; the tab bar also supports mouse drag reordering                                                         |
| `reset()`                         | Close all tabs and reset state                                                                                                       |
| `setIFramePath(path)`             | Set the iframe placeholder route path (called internally on mount)                                                                   |
| `getWrapper({ tabId?, pageId? })` | Get the content container DOM node; without arguments returns the first container, pass `tabId` or `pageId` when multiple tabs exist |
| `openInNewWindow(id)`             | Open an iframe tab in a new window (fallback when embedding fails)                                                                   |

> Close left / right / others are context-menu-only operations, handled inside `TabHeader`/`ContextMenu` through `useTabPanel`.

---

### useTabRouter

Stack-based navigation within a tab. **Can only be used inside page components within a tab**.

```ts
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScrollTarget } = useTabRouter()
```

| Method                      | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `forward(to)`               | Navigate forward to a new page within current tab  |
| `backward(to, backQuery?)`  | Navigate backward within current tab               |
| `addScrollTarget(selector)` | Register a DOM selector for scroll position memory |

#### forward

```ts
// Navigate to /detail page
forward({ path: '/detail', query: { id: '123' } })

// Push same route onto stack (same route can be pushed multiple times, each with independent cache)
forward({ path: '/list', query: { page: '2' } })
```

#### backward

```ts
// Go back 1 step (default)
backward(1)

// Go back N steps
backward(3)

// Go back to a specific path (auto-lookup from stack)
backward('/list')

// Go back with params (target page receives via props._back)
backward('/list', { result: 'success', data: { id: 1 } })
```

**Receiving params in target page:**

```vue
<script setup>
// Declare props to receive backward params
defineProps<{ _back?: { result: string; data: any } }>()
</script>
```

---

### useTabLoading

Page loading state control. **Can only be used inside page components within a tab**.

```ts
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

// Show loading overlay
openTabLoading()

// Close after async operation completes
fetchData().finally(() => closeTabLoading())
```

> Loading is automatically closed when the component unmounts — no manual cleanup needed.

---

## Props

`<VueStackTabs>` component properties:

| Prop                   | Type                        | Default                                                                    | Description                                                                                                                                                                           |
| ---------------------- | --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iframePath`           | `string`                    | **Required**                                                               | Path of the iframe placeholder route                                                                                                                                                  |
| `iframeSandbox`        | `string`                    | `allow-scripts allow-forms allow-popups allow-downloads allow-same-origin` | iframe sandbox policy; default is compatibility-first, not strict isolation — remove `allow-same-origin` for strict isolation; pass empty string to disable sandbox (not recommended) |
| `iframeReferrerPolicy` | `ReferrerPolicy`            | `strict-origin-when-cross-origin`                                          | iframe referrerpolicy attribute                                                                                                                                                       |
| `iframeAllow`          | `string`                    | `''`                                                                       | iframe allow attribute, e.g. `fullscreen`                                                                                                                                             |
| `iframeLoadTimeout`    | `number`                    | `15000`                                                                    | iframe load timeout in ms                                                                                                                                                             |
| `defaultTabs`          | `ITabData[]`                | `[]`                                                                       | Initial tab list                                                                                                                                                                      |
| `homeTab`              | `ITabData`                  | —                                                                          | Pinned home tab: always first, non-closable and non-draggable; other tabs cannot move before it. Omit to keep the previous behavior.                                                  |
| `max`                  | `number`                    | `20`                                                                       | Maximum number of tabs                                                                                                                                                                |
| `contextmenu`          | `boolean \| object`         | `true`                                                                     | Enable context menu                                                                                                                                                                   |
| `pageTransition`       | `string`                    | `'stack-tab-swap'`                                                         | Page transition animation name for forward navigation                                                                                                                                 |
| `pageTransitionBack`   | `string`                    | `'stack-tab-swap-back'`                                                    | Page transition animation name for backward navigation                                                                                                                                |
| `tabTransition`        | `string \| TransitionProps` | `'stack-tab-zoom'`                                                         | Transition effect for tab add/remove                                                                                                                                                  |
| `tabScrollMode`        | `TabScrollMode`             | `'both'`                                                                   | Tab bar scroll mode: `'wheel'` / `'button'` / `'both'`                                                                                                                                |
| `space`                | `number`                    | `300`                                                                      | Pixel distance scrolled per tab bar step                                                                                                                                              |
| `width`                | `string`                    | `'100%'`                                                                   | Container width                                                                                                                                                                       |
| `height`               | `string`                    | `'100%'`                                                                   | Container height                                                                                                                                                                      |
| `i18n`                 | `string`                    | `'zh-CN'`                                                                  | i18n locale, built-in `'zh-CN'` / `'en'`                                                                                                                                              |
| `globalScroll`         | `boolean`                   | `false`                                                                    | Enable page-level scroll memory                                                                                                                                                       |
| `sessionPrefix`        | `string`                    | `''`                                                                       | sessionStorage key prefix; useful for multiple instances on the same origin                                                                                                           |
| `iframeAllowedOrigins` | `string[]`                  | `[]` (plus current origin)                                                 | Allowed origins for iframe postMessage openTab                                                                                                                                        |

---

## Events

| Event          | Params         | Description                         |
| -------------- | -------------- | ----------------------------------- |
| `onActive`     | `(id: string)` | Triggered when a tab is activated   |
| `onPageLoaded` | —              | Triggered when page component loads |

```vue
<VueStackTabs
  iframe-path="/iframe"
  @on-active="(id) => console.log('active:', id)"
  @on-page-loaded="() => console.log('page loaded')"
/>
```

---

## Slots

| Slot            | Slot props       | Description                                                          |
| --------------- | ---------------- | -------------------------------------------------------------------- |
| `leftButton`    | —                | Left area of the tab bar, usually with `TabHeaderButton`             |
| `rightButton`   | —                | Right area of the tab bar                                            |
| `iframeLoading` | `{ tab }`        | Custom loading placeholder for an iframe tab                         |
| `iframeError`   | `{ tab, retry }` | Custom error placeholder for an iframe tab; call `retry()` to reload |

```vue
<VueStackTabs iframe-path="/iframe">
  <template #leftButton>
    <TabHeaderButton title="Toggle" @click="collapse = !collapse" />
  </template>
  <template #iframeError="{ tab, retry }">
    <span>{{ tab.title }} failed to load</span>
    <button @click="retry">Retry</button>
  </template>
</VueStackTabs>
```

---

## iframe Tabs

### Open an iframe Tab

```ts
openTab({
  title: 'External Page',
  path: 'https://example.com',
  iframe: true
})
```

### Operations Inside iframe Pages

Within an iframe tab, you can communicate with the host container via `postMessage` to open new tabs or respond to refresh actions.

#### 1. Using Bridge Utilities (Recommended)

If the iframe page can reference the library code (or import the tools exported from `iframeBridge.ts`), this approach is recommended:

```ts
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

const parentOrigin = 'https://parent.example.com'

// Open a tab
postOpenTab(
  {
    title: 'New Page',
    path: '/detail',
    query: { id: '1' }
  },
  { targetOrigin: parentOrigin }
)

// Listen for refresh requests
const off = onRefreshRequest(
  () => {
    // Custom refresh logic
    location.reload()
  },
  { allowedOrigins: [parentOrigin] }
)
```

#### 2. Native Integration

If you cannot import the library utilities or want zero dependencies, use the native API:

```ts
const parentOrigin = 'https://parent.example.com'

// Open a tab
window.parent.postMessage(
  {
    type: 'vue-stack-tabs:openTab',
    payload: {
      title: 'Native New Page',
      path: '/detail'
    }
  },
  parentOrigin
)

// Listen for refresh requests
window.addEventListener('message', (ev) => {
  if (ev.origin !== parentOrigin) return
  if (ev.source !== window.parent) return
  if (ev.data?.type === 'vue-stack-tabs:refresh') {
    // Perform refresh
    location.reload()
  }
})
```

### iframe Refresh Modes

You can specify refresh behavior via `iframeRefreshMode` when calling `openTab`:

- `postMessage` (default): Host sends a `vue-stack-tabs:refresh` message to the iframe; the inner page decides how to refresh (smoother animation).
- `reload`: Host directly resets the iframe's `src` or `key` to trigger a browser-forced reload (suitable for cross-origin or unmodifiable pages).

---

## Theming

Every color and shadow is controlled by CSS variables. Light-theme defaults match the previous release, so no change is needed after upgrading. Re-skin by overriding variables:

```css
:root {
  --stack-tab-accent: #4f46e5;
  --stack-tab-accent-active: #4338ca;
  --stack-tab-accent-contrast: #fff;
}
```

A dark palette is built in and activates via `<html class="dark">`, `<html data-theme="dark">` or any `[data-theme="dark"]` container. See the [theming guide](https://jktantan.github.io/vue-stack-tabs/advance/theme) for the full variable list and scoped overrides.

## i18n

Built-in languages: `zh-CN` (Chinese), `en` (English).

```ts
// Switch language via component prop
// <VueStackTabs iframe-path="/iframe" i18n="en" />

// Or when installing the plugin
app.use(VueStackTabs, [{ locale: 'en' }])
```

Custom language pack (`messages` is a nested object and is deep-merged with the built-in languages):

```ts
app.use(VueStackTabs, [
  {
    locale: 'ja-JP',
    messages: {
      VueStackTab: {
        close: 'Close',
        reload: 'Reload',
        loading: 'Loading'
        // ...
      }
    }
  }
])
```

---

## Type Definitions

```ts
import type { LocationQueryRaw } from 'vue-router'

/** Data passed when opening a tab */
interface ITabData {
  id?: string // Tab ID (auto-generated UUID if omitted)
  title: string // Tab title
  path: string // Route path or iframe URL
  query?: LocationQueryRaw // Route params
  closable?: boolean // Whether closable (default true)
  refreshable?: boolean // Whether refreshable (default true)
  iframe?: boolean // Whether it's an iframe tab (default false)
  iframeRefreshMode?: 'postMessage' | 'reload' // iframe refresh method
}

/** Tab bar scroll mode */
enum TabScrollMode {
  WHEEL = 'wheel',
  BUTTON = 'button',
  BOTH = 'both'
}
```

---

## Project Structure

```
src/lib/
├── StackTabs.vue           # Main component
├── index.ts                # Entry & exports
├── hooks/                  # Core logic
│   ├── useTabActions.ts    # Public API
│   ├── useTabRouter.ts     # In-tab navigation
│   ├── useTabLoading.ts    # Loading state
│   └── useTabPanel.tsx     # Core engine
├── model/TabModel.ts       # Type definitions
├── components/             # UI components
├── nuxt/                   # Nuxt module
└── assets/style/           # Styles
```

For detailed architecture design, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## License

[Apache-2.0](./LICENSE)
