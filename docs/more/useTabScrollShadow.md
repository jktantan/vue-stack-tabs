# useTabScrollShadow

Read and control the top/bottom scroll shadows of the current page. It can be called from any component inside a cached page, including layout components that wrap the page content.

```typescript
import { useTabScrollShadow } from 'vue-stack-tabs'

const shadow = useTabScrollShadow()
```

::: warning
Call it inside a cached page of `<VueStackTabs>`. The controller is provided by the cache wrapper; calling it outside a tab page throws.
:::

The library computes shadows from the main scroll container. `state` describes **which side should be visible**, not the scroll direction:

| Value      | Meaning                                 | Effect                          |
| ---------- | --------------------------------------- | ------------------------------- |
| `'none'`   | Content fits, or the view is at an edge | No shadow                       |
| `'top'`    | There is content above                  | Top shadow only                 |
| `'bottom'` | There is content below                  | Bottom shadow only              |
| `'both'`   | Content exists above and below          | Top and bottom shadows together |

The default edge threshold is 5px: a distance ≤ 5px counts as being at the edge, so that side's shadow is hidden.

## Members

| Member               | Description                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `state`              | Which side should be visible (read-only reactive)                                                   |
| `enabled`            | Whether the library may render any shadow; `true` when either side is on (read-only reactive)       |
| `enabledSides`       | Per-side render switches (read-only reactive `{ top, bottom }`)                                     |
| `setEnabled(config)` | Override shadows for the current page; `boolean` controls both sides, an object can toggle one side |
| `reset()`            | Clear the override and fall back to the global `scroll-shadow` config                               |
| `getState()`         | Read the current side synchronously                                                                 |
| `onStateChange(cb)`  | Subscribe to direction changes; returns an unsubscribe function                                     |

## Example

```vue:line-numbers
<script setup lang="ts">
import { useTabScrollShadow } from 'vue-stack-tabs'

const shadow = useTabScrollShadow()

// 'none' | 'top' | 'bottom' | 'both'
console.log(shadow.state.value)

// Disable library shadows for this page; state keeps updating
shadow.setEnabled(false)

// Disable only the bottom shadow; the top shadow is still rendered
shadow.setEnabled({ bottom: false })

// Per-side render switches, resolved to booleans
console.log(shadow.enabledSides.value) // { top: true, bottom: false }

// Restore automatic behavior
shadow.reset()

// Callback subscription; returns an unsubscribe function
const stop = shadow.onStateChange((state) => {
  console.log(state)
})
</script>
```

## Relationship with the global config

- A page-level override wins over `<VueStackTabs :scroll-shadow="...">`.
- `setEnabled(false)` / `setEnabled({ top: false })` only disable the library's shadow rendering; `state` keeps updating from the scroll position, which is useful when you draw your own shadows.
- `setEnabled(true)` / `reset()` restore library rendering.
- `enabled` is `true` when either side is enabled; read `enabledSides` to check a specific side.
- With `pageScroll="none"` and no registered scroll source, the state stays `none`; it recomputes after registering one with [`useTabPageScroll`](./useTabPageScroll.md).

Related: [Scroll position](../advance/scroll.md), [Props](./properties.md), [useTabPageScroll](./useTabPageScroll.md)
