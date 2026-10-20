# In-Tab Operations

::: warning
The following APIs should only be used inside tab pages.
:::

## Loading Indicator

`useTabLoading` shows a page-level overlay above the current tab. Call it inside a page rendered by `<VueStackTabs>` — the library injects the owning tab id into the page, and the overlay is rendered per tab.

```vue:line-numbers
<script setup lang="ts">
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

const submit = async () => {
  openTabLoading()
  try {
    await saveForm()
  } finally {
    closeTabLoading()
  }
}
</script>
```

- Only the current tab is covered; other tabs and the tab bar stay interactive.
- The overlay closes automatically when the page unmounts, but close it yourself as soon as the request settles so the user is not left waiting.
- Calling it outside a tab page does nothing — see [useTabLoading](../more/useTabLoading.md) for the full reference.

## Navigation

### Forward

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'

const { forward } = useTabRouter()

forward({
  path: '/next',
  query: { a: 'xxxx', b: 'xxxx' }
})
```

### Backward

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'

const { backward } = useTabRouter()

// By steps — go back 3 steps, passing extra params to the target page (received via props._back)
backward(3, { refresh: true })

// By path — jump to first matching path
backward('/next/1', { refresh: true })
```
