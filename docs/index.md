---
layout: home

hero:
  name: Vue Stack Tabs
  text: Tab-level isolation, stack-based navigation
  tagline: A tab manager for Vue 3 and Vue Router. Every tab keeps its own page instance, cache and navigation stack — pages in different tabs never interfere.
  image:
    src: /img/logo.svg
    alt: Vue Stack Tabs
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Live Demo
      link: /demo
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
    title: Route-level tabs
    details: Each tab owns its own route stack, so switching tabs switches a whole set of page instances — driven by Vue Router.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12h12"/>
        <path d="m12 8 4 4-4 4"/>
        <path d="M20 5v14"/>
      </svg>
    title: Forward / backward inside a tab
    details: 'forward pushes a page onto the tab stack; backward pops it and evicts its cache — like browser history, but per tab.'
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="13" height="13" rx="2"/>
        <path d="M8 20h11a2 2 0 0 0 2-2V7"/>
      </svg>
    title: Independent cache per tab
    details: The same component can live in several tabs with separate caches. Closing a tab evicts its pages; nothing leaks between tabs.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <path d="M3 9h18"/>
        <path d="M7 13h6"/>
        <path d="M7 16h4"/>
      </svg>
    title: iframe tabs
    details: Embed external pages as tabs and talk to them both ways with a postMessage bridge — including opening new tabs from inside the iframe.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 4v16"/>
        <path d="m8 8 4-4 4 4"/>
        <path d="m8 16 4 4 4-4"/>
      </svg>
    title: State and scroll are kept
    details: Form input, component state and scroll offsets survive tab switches, and session restore brings the open tabs back after a reload.
  - icon: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 4 9 16H3z"/>
        <path d="M8 16h8"/>
      </svg>
    title: Nuxt 3/4 module
    details: One module registers the global component and auto-imports the composables. Also works with a plain Vue 3 plugin.
---

## Install in 30 seconds

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

Then put `<VueStackTabs iframe-path="/iframe" />` in the parent route that should host the tabs, and let the router do the rest. See [Getting Started](./guide/).

## Compared with one iframe per tab

|               | one iframe per tab           | vue-stack-tabs                                         |
| ------------- | ---------------------------- | ------------------------------------------------------ |
| Isolation     | browser-level, the strongest | Vue scope level — enough, and yours to control         |
| Runtime cost  | one app runtime per iframe   | one shared runtime, pages cached per tab               |
| Communication | `postMessage` serialization  | reuse components, stores and types directly            |
| Routing       | separate URL and history     | synced with Vue Router, stack-based forward / backward |
| Styling       | isolated by the browser      | you decide the boundary                                |

When you actually need document-level isolation — embedding a third-party site, for example — the [iframe tab](./advance/iframe-bridge.md) is still there.

## Where to go next

- [Getting Started](./guide/) — from install to your first tab
- [Live Demo](./demo) — a real app with tabs, forward/backward and an iframe tab
- [API Reference](./more/useTabActions.md) — `useTabActions`, `useTabRouter`, `useTabLoading`
