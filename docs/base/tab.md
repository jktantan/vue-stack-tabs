# Tab Operations

## Open Tab

Use `useTabActions` to open or switch tabs:

**Example:**

```typescript
import { useTabActions } from 'vue-stack-tabs'

const { openTab } = useTabActions()

/**
 * If id is omitted, a new tab is created.
 * If id exists, the tab is activated and shown.
 * Returns a Promise resolving to the tab id.
 */
const tabId = await openTab({
  id: 'dashboard',
  title: 'Home',
  path: '/dashboard',
  closable: false
})
```

## Switch Tab

**Example:**

```typescript
import { useTabActions } from 'vue-stack-tabs'

const { activeTab } = useTabActions()
activeTab('dashboard')
```

## Reset Tabs

**Example:**

```typescript:line-numbers
import { useTabActions } from 'vue-stack-tabs'

const { reset } = useTabActions()
reset()
```

## Tab Loading Indicator

`useTabLoading` shows a page-level overlay above the current tab. It must be used inside a page component rendered by `<VueStackTabs>`, because the library resolves the owning tab from the `tId` it injects into the page.

```vue:line-numbers
<script setup lang="ts">
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

const load = async () => {
  openTabLoading()
  try {
    await fetchData()
  } finally {
    closeTabLoading()
  }
}
</script>
```

Only the current tab is masked; other tabs keep working. See [useTabLoading](../more/useTabLoading.md) for the full API, and [In-Tab Operations](./operator.md) for the scope rules.
