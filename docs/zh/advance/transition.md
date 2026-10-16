# 过渡效果

您可以通过配置 VueStackTabs 组件的 **tab-transition**、**page-transition** 和 **page-transition-back** 属性，分别替换默认的**页签**、**页面前进**和**页面后退**过渡效果。

- `page-transition`：**前进**时使用（压入新页面，或在栈中向前切换）
- `page-transition-back`：**后退**时使用（通过 `useTabRouter.backward` 出栈）

::: warning

- 如果是组件作用域内的 CSS(配置了 scoped)，需要在选择器前添加 >>>、 /deep/ 或 ::v-deep 才能生效
- 页签项 .stack-tab-item 默认设置了 transition 和 transform-origin 的样式，您可能需要覆盖它以避免影响到自定义的过渡效果

:::

## 示例

```vue:line-numbers
<template>
  <vue-stack-tabs
    page-transition="page-fade"
    page-transition-back="page-fade-back"
    tab-transition="tab-scale"
  />
</template>

<style lang="scss">
    // 页面 fade 过渡
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

    // 页面后退过渡
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

    // 页签 scale 过渡
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
