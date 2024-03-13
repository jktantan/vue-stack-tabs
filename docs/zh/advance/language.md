# 过渡效果

您可以通过配置 RouterTab 组件的 **tab-transition** 和 **page-transition** 属性，分别替换默认的**页签**和**页面**过渡效果

::: warning
* 如果是组件作用域内的 CSS(配置了 scoped)，需要在选择器前添加 >>>、 /deep/ 或 ::v-deep 才能生效
* 页签项 .stack-tab-item 默认设置了 transition 和 transform-origin 的样式，您可能需要覆盖它已避免影响到自定义的过渡效果
:::

## 示例

```vue
<template>
  <vue-stack-tabs page-transition="page-fade" tab-transition="tab-scale" />
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

