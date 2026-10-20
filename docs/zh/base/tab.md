# 页签操作

## 打开

VueStackTabs 提供 useTabActions 来打开或切换页签

**示例：**

```typescript
// 引用 useTabActions
import { useTabActions } from 'vue-stack-tabs'

const { openTab } = useTabActions()

/**
 * 如果没传 ID，则新建页签
 * ID 相同时，则只切换页签并显示最后页面
 * 返回 Promise，resolve 为页签 ID
 */
const tabId = await openTab({
  id: 'dashboard',
  title: '首页',
  path: '/dashboard',
  closable: false
})
```

## 切换页签

**示例：**

```typescript
// 引用 useTabActions
import { useTabActions } from 'vue-stack-tabs'

const { activeTab } = useTabActions()

// 传入页签ID
activeTab('dashboard')
```

## 重置页签

**示例：**

```typescript:line-numbers
// 引用 useTabActions
import { useTabActions } from 'vue-stack-tabs'

const { reset } = useTabActions()

reset()
```

## 页签页面加载动画

`useTabLoading` 会在当前页签上方显示页面级遮罩。它只能在由 `<VueStackTabs>` 渲染的页面组件中使用：库会向页面注入 `tId`，并据此定位所属页签。

```vue:line-numbers
<script setup lang="ts">
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

const load = async () => {
  openTabLoading()
  try {
    await fetchData()
  } finally {
    closeTabLoading()
  }
}
</script>
```

遮罩只覆盖当前页签，其它页签照常工作。完整 API 见 [useTabLoading](../more/useTabLoading.md)，调用范围说明见[签内操作](./operator.md)。
