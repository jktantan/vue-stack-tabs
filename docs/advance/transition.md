# Transitions

You can customize tab and page transitions via `tab-transition`, `page-transition`, and `page-transition-back` props:

- `page-transition`: applied when navigating **forward** (push new page or switch tabs forward in stack)
- `page-transition-back`: applied when navigating **backward** (pop the tab stack via `useTabRouter.backward`)

::: warning

- For scoped CSS, use `>>>`, `/deep/`, or `::v-deep` for selectors to take effect.
- The tab item `.stack-tab-item` has default `transition` and `transform-origin`. You may need to override them for custom transitions.
  :::

**Example:**

```vue:line-numbers
<template>
  <vue-stack-tabs
    page-transition="page-fade"
    page-transition-back="page-fade-back"
    tab-transition="tab-scale"
  />
</template>

<style lang="scss">
.page-fade {
  &-enter-active,
  &-leave-active {
    transition: opacity 0.5s;
  }
  &-enter,
  &-leave-to {
    opacity: 0;
  }
}

.page-fade-back {
  &-enter-active,
  &-leave-active {
    transition: opacity 0.3s, transform 0.3s;
  }
  &-enter {
    transform: translateX(-20px);
    opacity: 0;
  }
  &-leave-to {
    transform: translateX(20px);
    opacity: 0;
  }
}

.tab-scale {
  &-enter-active,
  &-leave-active {
    transition: opacity 0.5s, transform 0.5s;
  }
  &-enter,
  &-leave-to {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>
```
