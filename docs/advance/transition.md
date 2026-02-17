# Transitions

You can customize tab and page transitions via `tab-transition` and `page-transition` props:

::: warning

- For scoped CSS, use `>>>`, `/deep/`, or `::v-deep` for selectors to take effect.
- The tab item `.stack-tab-item` has default `transition` and `transform-origin`. You may need to override them for custom transitions.
:::

**Example:**

```vue:line-numbers
<template>
  <vue-stack-tabs page-transition="page-fade" tab-transition="tab-scale" />
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
