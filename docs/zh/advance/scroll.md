# 滚动位置

通过设置滚动元素，已经缓存的页签在重新激活时，将会保持滚动位置。

## 全局滚动

VueStackTabs 默认不开启全局滚动，如需全局滚动请设置`global-scroll`

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe" global-scroll />
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

## 自定义滚动容器

通过 `scroll-container` 传入自己的滚动组件（例如 Element Plus 的 `ElScrollbar`），由它承载每个页签的内容区滚动。这是一个可选的扩展点：不传该属性时，内建 `overflow: auto` 的 wrapper 行为与旧版本完全一致。组件渲染在**每个缓存页 wrapper 内部**，因此每个页签仍然独立记忆滚动位置。

```vue:line-numbers
<!-- PageScroll.vue -->
<template>
  <el-scrollbar ref="scrollbar" height="100%">
    <slot />
  </el-scrollbar>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScrollbarInstance } from 'element-plus'

const scrollbar = ref<ScrollbarInstance>()
defineExpose({
  scrollElement: computed(
    () => (scrollbar.value?.wrapRef as unknown as HTMLElement | undefined) ?? null
  )
})
</script>
```

```vue:line-numbers
<vue-stack-tabs iframe-path="/iframe" :scroll-container="PageScroll" />
```

自定义滚动组件需要满足：

1. 渲染默认插槽——库把页面 vnode 作为插槽内容传入。
2. 根元素填满父容器（`height: 100%`）。
3. 通过 `expose` 暴露真实滚动元素 `scrollElement`。

传入 `scroll-container` 后 wrapper 恒为 `overflow: hidden`，`global-scroll` 只对默认（未传自定义容器）路径生效。`PageLoading` 位于滚动容器外层，保证遮罩覆盖整个内容区。

### 命令式滚动组件

如果滚动不是由原生 `scrollTop` 驱动（BetterScroll、虚拟滚动），可以实现完整的适配器契约：

```ts
export interface StackTabsScrollAdapter {
  scrollElement?: HTMLElement | null
  getPosition?: () => { top: number; left: number }
  setPosition?: (position: { top: number; left: number }) => void
  getMetrics?: () => { scrollTop: number; scrollHeight: number; clientHeight: number }
  onScroll?: (listener: () => void) => () => void
}
```

位置记忆使用 `getPosition` / `setPosition`，滚动阴影使用 `getMetrics` / `onScroll`。缺失的能力会回退到原生 `scrollElement`；两者都不可用时仅关闭阴影，不影响页面渲染。
