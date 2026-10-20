# 初始化页签

通过配置 StackTabs 组件的 `default-tabs` 属性，可以设置进入页面时默认显示的页签。
:::warning
建议配置至少一个默认页签，并把第一个设为不可关闭，保证应用始终有落地页签。
:::

第一个页签的 `path` 应与应用入口路由一致。首次进入时 URL 上还没有 `__tab`：组件会把当前路由归属到栈顶 path 匹配的默认页签，并把 `__tab` 写回地址，从而让 URL 始终指向当前页签。

## 示例

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe" :default-tabs="defaultTabs" />
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
