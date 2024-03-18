# 初始化页签

通过配置 StackTabs 组件的 `default-tabs` 属性，可以设置进入页面时默认显示的页签。
:::warning
默认页签必须要配置，且第一个页签应为非可关闭页签
:::
## 示例

```vue:line-numbers
<template>
  <vue-stack-tabs :default-tabs="defaultTabs" />
</template>
<script lang="ts" setup>
  import { type ITabData } from 'vue-stack-tabs'

  const defaultTabs: ITabData[] = [
    {
      id: 'dashboard',
      title: '首页',
      path: '/dashboard',
      closable: false
    }
  ]

</script>
```

