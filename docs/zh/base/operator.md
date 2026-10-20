# 签内操作

:::warning
以下引用及功能只能在页签内页面使用
:::

## 加载动画

`useTabLoading` 会在当前页签上方显示页面级遮罩。请在本页签的页面组件中调用——库会把所属页签的 id 注入页面，遮罩按页签渲染。

```vue:line-numbers
<script setup lang="ts">
import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

const submit = async () => {
  openTabLoading()
  try {
    await saveForm()
  } finally {
    closeTabLoading()
  }
}
</script>
```

- 只遮挡当前页签，其它页签与标签栏仍可交互。
- 页面卸载时遮罩会自动关闭，但请求结束就应主动关闭，避免用户干等。
- 在页签外调用不会生效，完整说明见 [useTabLoading](../more/useTabLoading.md)。

## 路由

### 前进

```typescript:line-numbers
// 引用 vue-stack-tabs
import { useTabRouter } from 'vue-stack-tabs'

const { forward } = useTabRouter()

forward({
    path: '/next',
    query:{
      a: 'xxxx',
      b: 'xxxx'
    }
})
```

### 后退

```typescript:line-numbers
// 引用 vue-stack-tabs
import { useTabRouter } from 'vue-stack-tabs'

const { backward } = useTabRouter()

//使用步数，即回退3步，第二个参数为随回退传给目标页的一次性参数（目标页通过 props._back 接收）
backward(3,{
  refresh: true,
})
//使用地址
backward('/next/1',{
  refresh: true
})
```
