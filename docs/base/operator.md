# In-Tab Operations

::: warning
The following APIs should only be used inside tab pages.
:::

## Loading Indicator

**Example:**

```typescript:line-numbers
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

openTabLoading()
closeTabLoading()
```

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

// By steps — go back 3 steps
backward(3, { refresh: true })

// By path — jump to first matching path
backward('/next/1', { refresh: true })
```
