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
