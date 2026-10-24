# Scroll Position

When scroll targets are set, cached tabs will restore their scroll position when reactivated.

## Global Scroll

By default, global scroll is off. Enable it with `global-scroll`:

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe" global-scroll />
</template>
```

## Page Scroll Targets

### Attribute marker (recommended)

Add `data-stack-tab-scroll` to an inner scroll container. Its position is saved and restored when switching tabs. Only marked elements are queried; the whole page is not scanned.

```vue
<div class="table-scroll" data-stack-tab-scroll>
  <!-- Scrollable content -->
</div>
```

Nested or multiple internal scroll containers can each use this attribute.

### Manual registration

When the scrollbar is inside a page element, use `addScrollTarget`:

**Single target:**

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'
const { addScrollTarget } = useTabRouter()
addScrollTarget('.custom-scroller')
```

**Multiple targets:**

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'
const { addScrollTarget } = useTabRouter()
addScrollTarget('.custom-scroller-1', '.custom-scroller-2')
```

## Custom Scroll Container

Pass a component through `scroll-container` to let your own scroll component (for example Element Plus `ElScrollbar`) host the content area of every tab. It is an opt-in extension point: when the prop is omitted, the built-in `overflow: auto` wrapper behaves exactly as before. The component is rendered **inside each cached page wrapper**, so every tab keeps its own scroll position.

```vue:line-numbers
<!-- PageScroll.vue -->
<template>
  <el-scrollbar ref="scrollbar" height="100%">
    <slot />
  </el-scrollbar>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScrollbarInstance } from 'element-plus'

const scrollbar = ref<ScrollbarInstance>()
defineExpose({
  scrollElement: computed(
    () => (scrollbar.value?.wrapRef as unknown as HTMLElement | undefined) ?? null
  )
})
</script>
```

```vue:line-numbers
<vue-stack-tabs iframe-path="/iframe" :scroll-container="PageScroll" />
```

Requirements for a custom scroll component:

1. Render the default slot — the library passes the page vnode as slot content.
2. Fill the parent (`height: 100%`).
3. Expose the real scrolling element as `scrollElement`.

When `scroll-container` is set, the wrapper always uses `overflow: hidden` and `global-scroll` only affects the default (no custom container) path. `PageLoading` stays outside the scroll container so the overlay always covers the whole content area.

### Imperative scroll components

If scrolling is not driven by native `scrollTop` (BetterScroll, virtual scrolling), expose an adapter instead:

```ts
export interface StackTabsScrollAdapter {
  scrollElement?: HTMLElement | null
  getPosition?: () => { top: number; left: number }
  setPosition?: (position: { top: number; left: number }) => void
  getMetrics?: () => { scrollTop: number; scrollHeight: number; clientHeight: number }
  onScroll?: (listener: () => void) => () => void
}
```

`getPosition` / `setPosition` are used for position memory, `getMetrics` / `onScroll` for the scroll shadow. Any missing capability falls back to the native `scrollElement`; if none is available the shadow is simply disabled.
