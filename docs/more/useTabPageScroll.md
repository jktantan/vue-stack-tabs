# useTabPageScroll

Register the page's own scroll source with the library so scroll restoration and content shadows keep working. Useful with `page-scroll="none"` (the default), custom scroll components and imperative scrollers such as virtual lists.

```typescript
import { useTabPageScroll } from 'vue-stack-tabs'

const pageScroll = useTabPageScroll()

pageScroll.attach(scrollElement.value)
pageScroll.detach()
```

::: warning
Call it inside a cached page of `<VueStackTabs>`. The controller is provided by the cache wrapper; calling it outside a tab page throws.
:::

## attach

Register the main scroll source of the current page. An `HTMLElement` is read and written through native `scrollTop` / `scrollLeft`; an adapter can provide position, metrics and scroll subscription capabilities; `null` is equivalent to `detach()`.

**Call:** `attach(source: HTMLElement | StackTabsScrollAdapter | null)`

```typescript:line-numbers
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useTabPageScroll } from 'vue-stack-tabs'

const pageScroll = useTabPageScroll()
const scrollElement = ref<HTMLElement | null>(null)

onMounted(() => pageScroll.attach(scrollElement.value))
onBeforeUnmount(() => pageScroll.detach())
```

Imperative scrollers (BetterScroll, virtual scrolling) can implement the adapter:

```typescript
pageScroll.attach({
  getPosition: () => ({ top, left }),
  setPosition: (position) => {
    top = position.top
    left = position.left
  },
  getMetrics: () => ({ scrollTop: top, scrollHeight, clientHeight }),
  onScroll: (listener) => {
    // subscribe to your own scroll event
    return () => {
      // unsubscribe
    }
  }
})
```

## detach

Remove the main scroll source of the current page and fall back to the page factory's default strategy.

**Call:** `detach()`

## Priority

A page-registered scroll source wins:

```text
useTabPageScroll > pageScroll component > native wrapper
```

Once registered, both scroll restoration and `useTabScrollShadow()` state use this source.

## Adapter contract

```typescript
interface StackTabsScrollAdapter {
  scrollElement?: HTMLElement | null
  getPosition?: () => { top: number; left: number } | null | undefined
  setPosition?: (position: { top: number; left: number }) => void
  getMetrics?: () =>
    { scrollTop: number; scrollHeight: number; clientHeight: number } | null | undefined
  onScroll?: (listener: () => void) => () => void
}
```

| Member          | Purpose                                 | Fallback when missing                         |
| --------------- | --------------------------------------- | --------------------------------------------- |
| `scrollElement` | The real native scroll element          | None; dependent capabilities stay unavailable |
| `getPosition`   | Read the scroll position                | Read `scrollElement.scrollTop / scrollLeft`   |
| `setPosition`   | Write the scroll position               | Write `scrollElement.scrollTop / scrollLeft`  |
| `getMetrics`    | Scroll metrics for shadow calculation   | Read the element's native size properties     |
| `onScroll`      | Subscribe to scroll; return unsubscribe | Listen for `scroll` on `scrollElement`        |

Every optional member falls back to `scrollElement`; when neither is available, only shadows and position restoration are disabled — rendering is unaffected.

Related: [Scroll position](../advance/scroll.md), [useTabScrollShadow](./useTabScrollShadow.md), [Props](./properties.md)
