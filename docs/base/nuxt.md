# Nuxt

## Option 1: Nuxt Module (Recommended)

Configure the module in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: {
    locale: 'zh-CN', // or 'en'
    // Extra locales beyond the built-in packs; same shape as the plugin options
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

`messages` is merged with the built-in packs; missing keys fall back to the built-in
`zh-CN` / `en` packs. The module only registers locales during installation — runtime
switching still uses `<VueStackTabs :i18n="...">` with the current locale.

The module automatically:

- Registers the global `VueStackTabs` component via Nuxt's `addComponent` API (no need to import manually)
- Auto-imports composables (`useTabActions`, `useTabRouter`, `useTabLoading`)
- Applies the configured `locale` and `messages` to vue-stack-tabs' internal i18n instance

Nuxt apps also support only one `<VueStackTabs>` instance.

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
