# Scroll Position

When scroll targets are set, cached tabs will restore their scroll position when reactivated.

## Global Scroll

By default, global scroll is off. Enable it with `global-scroll`:

```vue:line-numbers
<template>
  <vue-stack-tabs global-scroll />
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
