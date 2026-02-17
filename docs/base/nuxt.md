# Nuxt

## Option 1: Nuxt Module (Recommended)

Configure the module in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: {
    locale: 'zh-CN'  // or 'en'
  }
})
```

The module automatically:

- Registers the VueStackTabs component
- Auto-imports composables (`useTabActions`, `useTabRouter`, `useTabLoading`)

## Option 2: Manual Plugin

`plugins/StackTabs.ts`:

```javascript:line-numbers
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'

export default defineNuxtPlugin(({ vueApp }) => {
  vueApp.use(VueStackTabs)
})
```

## Configure iframe Route

### iframe Component

**Example — `components/FakeIFrame.vue`:**

```vue:line-numbers
<script setup lang="ts">
  import { useTabRouter } from 'vue-stack-tabs'
  useTabRouter()
</script>

<template></template>
```

### Nuxt Config

`nuxt.config.ts`:

```typescript:line-numbers
export default defineNuxtConfig({
  // ...
  hooks: {
    'pages:extend'(pages: any) {
      pages.push({
        name: 'iframe',
        path: '/iframe',
        file: '~/components/FakeIFrame.vue'
      })
    }
  },
  // ...
})
```

## Use the Component

> See [Props](../more/properties.md) for options.

::: danger
VueStackTabs is singleton-only. Configure `iframe-path` for the iframe route.
:::

**Layout — `layouts/default.vue`:**

```vue:line-numbers {5}
<template>
  <div class="app-header">Header</div>
  <div class="app-body">
    <div class="app-side">Sidebar</div>
    <vue-stack-tabs iframe-path="/iframe" />
  </div>
</template>
```
