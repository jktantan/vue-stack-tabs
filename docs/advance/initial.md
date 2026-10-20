# Initial Tabs

Use the `default-tabs` prop to set the default tabs shown when the page loads.

::: warning
Configure at least one default tab, and make the first one non-closable so the app always has a landing tab.
:::

The first tab's `path` should match the route the app is entered with. On first load the URL carries no `__tab` yet: VueStackTabs adopts the default tab whose top page matches the current route and writes `__tab` back into the address, so the URL always points at the active tab.

**Example:**

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe" :default-tabs="defaultTabs" />
</template>
<script lang="ts" setup>
  import { type ITabData } from 'vue-stack-tabs'

  const defaultTabs: ITabData[] = [
    {
      id: 'dashboard',
      title: 'Home',
      path: '/dashboard',
      closable: false
    }
  ]
</script>
```
