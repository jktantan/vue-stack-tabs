# useTabRouter

Used for navigation within a tab (forward/backward). Must be used inside tab pages only.

```typescript
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScrollTarget } = useTabRouter()
```

## forward

Push a new page onto the tab stack.

**Call:** `forward(to: RouteLocationPathRaw)`

## backward

Pop or jump within the tab stack.

**Call:** `backward(to?: number | string, query?: Record<string, string>)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| to | number \| string | No | number: go back abs(x) steps; 0 = no-op. string: jump to first matching path |
| query | Record<string, string> | No | Params passed to the target page |

## addScrollTarget

Register scroll elements for the current page.

**Call:** `addScrollTarget(...scroller: string[])`

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'
const { addScrollTarget } = useTabRouter()

addScrollTarget('.custom-scroller')
addScrollTarget('.custom-scroller', '.custom-scroller-2')
addScrollTarget('#panel')
```
