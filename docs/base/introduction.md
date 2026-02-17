# Getting Started

## Live Preview

<DemoPreview path="/demo" title="Getting Started Demo" />

## Import the Plugin

**Example — `main.ts` entry:**

```javascript:line-numbers {5,6,14}
// vue-stack-tabs requires vue and vue-router
import { createApp } from 'vue'

// Import plugin and styles
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(VueStackTabs)
app.mount('#app')
```

## Use the Component

> See [Props](../more/properties.md) for configuration options.

::: danger
VueStackTabs is singleton-only. Do not mount multiple VueStackTabs on the same page!

Configure `iframe-path` for the iframe route path.
:::

**Example:**

```html:line-numbers {5}
<template>
  <div class="app-header">Header</div>
  <div class="app-body">
    <div class="app-side">Sidebar</div>
    <vue-stack-tabs iframe-path="/iframe" />
  </div>
</template>
```

## Route Configuration

Register the **iframe** route to support iframe tabs.

::: danger
The iframe route path must match the component's **iframe-path** prop.
:::

**Example — `router.ts`:**

```javascript:line-numbers {16,25,26,27}
import { createRouter, createWebHistory } from 'vue-router'
import Frame from '@/components/layout/Frame.vue'
import { IFrame } from 'vue-stack-tabs'

const importPage = (view: string) => () =>
  import(`@/views/${view}.vue`)

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Frame,  // must contain <vue-stack-tabs>
      children: [
        { path: '', name: 'home', component: () => importPage('home') },
        // iframe route - must match iframe-path
        { path: 'iframe', name: 'iframe', component: IFrame },
        { path: '404', component: () => importPage('404') },
        { path: ':pathMatch(.*)', redirect: '/404' }
      ]
    }
  ]
})
```
