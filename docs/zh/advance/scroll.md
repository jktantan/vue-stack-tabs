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

### 属性标记（推荐）

为内部滚动容器添加 `data-stack-tab-scroll`，切换标签时会自动保存和恢复其滚动位置。仅查询带该属性的元素，不会遍历页面全部节点。

```vue
<div class="table-scroll" data-stack-tab-scroll>
  <!-- 可滚动内容 -->
</div>
```

嵌套或多个内部滚动容器都可分别添加该属性。

### 手动注册

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
