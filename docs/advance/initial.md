# Initial Tabs

Use the `default-tabs` prop to set the default tabs shown when the page loads.

::: warning
You must configure default tabs. The first tab should be non-closable.
:::

The first tab's `path` should match the route the app is entered with. On first load the URL carries no `__tab` yet: VueStackTabs adopts the default tab whose top page matches the current route and writes `__tab` back into the address, so the URL always points at the active tab.

**Example:**

```vue:line-numbers
<template>
  <vue-stack-tabs :default-tabs="defaultTabs" />
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
