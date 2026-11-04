# useTabRouter

Used for navigation within a tab (forward/backward). Must be used inside tab pages only.

```typescript
import { useTabRouter } from 'vue-stack-tabs'

const { forward, backward, addScrollTarget, tabId, pageId } = useTabRouter()
```

## tabId / pageId

The current page's owning tab id and cache page id (read-only). Use `pageId` with
`useTabActions().getWrapper({ pageId })` to target this page's content container.

## forward

Push a new page onto the tab stack.

**Call:** `forward(to: RouteLocationPathRaw)`

## backward

Pop or jump within the tab stack.

**Call:** `backward(to: number | string, backQuery?: Record<string, unknown>)`

| Parameter | Type                    | Required | Description                                                                                                                                     |
| --------- | ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| to        | number \| string        | Yes      | number: go back abs(x) steps; 0 = no-op. string: jump to the first page in the stack matching that path. Returns `false` when nothing is popped |
| backQuery | Record<string, unknown> | No       | One-shot params for the target page; the target receives them as the `_back` prop                                                               |

**Returns:** `true` after the navigation transaction is started; `false` when the tab is missing, the step count is 0, or the target path is not in the stack.

The page context is provided by the cache wrapper through `tabPageContextKey`. Any component inside the page can read it directly:

```typescript:line-numbers
import { inject } from 'vue'
import { tabPageContextKey } from 'vue-stack-tabs'

const context = inject(tabPageContextKey, null)
// { tabId, pageId } | null
```

`resolveTabPageContext()` resolves the same context with a compatibility fallback to the legacy attrs / props injection; use it in helpers that cannot call `inject` directly.

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
