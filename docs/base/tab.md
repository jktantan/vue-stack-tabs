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
 * Returns the tab id.
 */
const tabId = openTab({
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

**Example:**

```typescript:line-numbers
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

openTabLoading()
closeTabLoading()
```
