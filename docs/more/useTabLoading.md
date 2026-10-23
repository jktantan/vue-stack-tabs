# useTabLoading

Controls the page-level loading overlay of the **current tab**.

```typescript
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()
```

::: warning
Call it inside a page component rendered by `<VueStackTabs>`. The hook resolves the owning tab from the page context provided by the library's cache wrapper; called outside a tab page — for example in the layout that hosts the tabs — there is no target, and the overlay never appears.
:::

The overlay is rendered per tab: it covers the current tab's page only, other tabs stay interactive, and the tab bar keeps working. Closing the tab or unmounting the page clears it automatically, so no manual cleanup is needed.

## openTabLoading

Show the overlay above the current tab's page.

**Call:** `openTabLoading()`

## closeTabLoading

Hide the overlay.

**Call:** `closeTabLoading()`

## Example

```vue:line-numbers
<script setup lang="ts">
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

const reload = async () => {
  openTabLoading()
  try {
    await fetch('/api/report')
  } finally {
    // Close it as soon as the request settles, including on failure
    closeTabLoading()
  }
}
</script>

<template>
  <button type="button" @click="reload">Reload data</button>
</template>
```

The page keeps its cached state while the overlay is visible; only the current tab is masked.

See the [live demo](../demo.md): open _Open the loading demo_ from the console and simulate a request.

## API

| Method              | Description                         |
| ------------------- | ----------------------------------- |
| `openTabLoading()`  | Show the overlay in the current tab |
| `closeTabLoading()` | Hide the overlay in the current tab |
