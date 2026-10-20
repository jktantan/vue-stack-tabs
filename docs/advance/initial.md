# Initial Tabs

Use the `default-tabs` prop to set the default tabs shown when the page loads.

::: warning
Use `home-tab` when you need a landing tab that always exists. With `default-tabs` alone, configure at least one tab and make it non-closable.
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

## Pinned home tab (home-tab)

`default-tabs` only decides which tabs are created on startup. When you need a home tab that always exists, cannot be closed, and cannot be moved, use `home-tab`:

```vue:line-numbers
<template>
  <vue-stack-tabs
    iframe-path="/iframe"
    :home-tab="{ id: 'home', title: 'Home', path: '/' }"
    :default-tabs="defaultTabs"
  />
</template>
<script lang="ts" setup>
  import { type ITabData } from 'vue-stack-tabs'

  const defaultTabs: ITabData[] = [
    {
      id: 'settings',
      title: 'Settings',
      path: '/settings'
    }
  ]
</script>
```

Behavior:

- The home tab is always created first and is forced to `closable: false`; it cannot be dragged, and other tabs cannot be moved before it.
- If `id` is omitted, an internal fixed id is used so the tab stays aligned with `__tab` / session after reload.
- When the URL has no `__tab`: the current path is first assigned to an existing tab (including `default-tabs`); only when nothing matches does it `replace` to the home tab's `path`.
- When the URL has a `__tab` (including an invalid one), it never falls back to home; the existing create/reuse behavior is kept, and an unknown page with a valid `__tab` is handled by the app's own 404 route.
- Do not put the same home tab into `default-tabs`; a matching `id` is ignored.
- Without `home-tab`, `default-tabs` behaves exactly as before.

::: warning
`home-tab.path` must be a route that actually exists in the app; otherwise the redirected page may be empty.
:::
