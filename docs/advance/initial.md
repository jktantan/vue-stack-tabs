# Initial Tabs

Use the `default-tabs` prop to set the default tabs shown when the page loads.

::: warning
You must configure default tabs. The first tab should be non-closable.
:::

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
