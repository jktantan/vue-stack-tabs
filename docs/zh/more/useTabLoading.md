# useTabLoading

控制**当前页签**的页面级加载遮罩。

```typescript
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()
```

::: warning
请在由 `<VueStackTabs>` 渲染的页面组件中调用。该 Hook 通过库注入到页面上的 `tId` 找到所属页签；如果在页签外调用（例如承载标签栏的布局组件里），就没有目标页签，遮罩不会出现。
:::

遮罩按页签渲染：只覆盖当前页签的页面，其它页签仍可交互，标签栏也不受影响。关闭该页签或页面卸载时遮罩会自动清除，无需手动收尾。

## openTabLoading

显示当前页签的加载遮罩。

**调用：** `openTabLoading()`

## closeTabLoading

关闭加载遮罩。

**调用：** `closeTabLoading()`

## 示例

```vue:line-numbers
<script setup lang="ts">
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

const reload = async () => {
  openTabLoading()
  try {
    await fetch('/api/report')
  } finally {
    // 请求结束（包括失败）立即关闭
    closeTabLoading()
  }
}
</script>

<template>
  <button type="button" @click="reload">重新加载数据</button>
</template>
```

遮罩显示期间页面仍保留缓存状态，只有当前页签被遮挡。

可以到[在线演示](../demo.md)里点控制台的「打开 Loading 演示」，触发一次模拟请求看效果。

## API

| 方法                | 说明                   |
| ------------------- | ---------------------- |
| `openTabLoading()`  | 显示当前页签的加载遮罩 |
| `closeTabLoading()` | 关闭当前页签的加载遮罩 |
