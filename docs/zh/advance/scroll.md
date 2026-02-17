# 滚动位置

通过设置滚动元素，已经缓存的页签在重新激活时，将会保持滚动位置。

## 全局滚动

VueStackTabs 默认不开启全局滚动，如需全局滚动请设置`global-scroll`

```vue:line-numbers
<template>
  <vue-stack-tabs global-scroll />
</template>
```

## 页面滚动元素

当滚动条在页面节点内部时，可以通过 `addScrollTarget` 设置页面滚动元素。

**示例：**

单个滚动元素

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'
const { addScrollTarget } = useTabRouter()

addScrollTarget('.custom-scroller')
```

多个滚动元素

```typescript:line-numbers
import { useTabRouter } from 'vue-stack-tabs'
const { addScrollTarget } = useTabRouter()

addScrollTarget('.custom-scroller-1', '.custom-scroller-2')
```
