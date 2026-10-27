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

## 阴影开关与状态

内容区上下阴影由库根据主滚动容器自动计算。可以通过组件属性统一关闭：

```vue:line-numbers
<vue-stack-tabs iframe-path="/iframe" :scroll-shadow="false" />
```

页面内的任意组件（包括包在 page 内容外的布局组件）都可以读取当前应该显示哪个方向的阴影，并手动覆盖开关：

```vue:line-numbers
<script setup lang="ts">
import { useTabScrollShadow } from 'vue-stack-tabs'

const shadow = useTabScrollShadow()

// 'none' | 'top' | 'bottom' | 'both'
console.log(shadow.state.value)

// 手动关闭当前页阴影；state 仍会继续更新
shadow.setEnabled(false)

// 恢复自动计算
shadow.reset()

// 回调订阅，返回取消订阅函数
const stop = shadow.onStateChange((state) => {
  console.log(state)
})
</script>
```

`state` 传的是**当前应该显示哪一侧的阴影**，不是滚动方向：

| 值         | 含义                             | 显示效果           |
| ---------- | -------------------------------- | ------------------ |
| `'none'`   | 内容不足一屏，或已经贴边         | 不显示阴影         |
| `'top'`    | 上方还有内容（通常已离开顶部）   | 只显示顶部阴影     |
| `'bottom'` | 下方还有内容（通常尚未滚到底部） | 只显示底部阴影     |
| `'both'`   | 上下都有内容                     | 顶部和底部同时显示 |

> 判定阈值默认 5px：距离边界 ≤ 5px 视为已贴边，不显示该侧阴影。

- `setEnabled(false)` 只关闭库的阴影渲染，`state` 仍然按滚动位置更新，适合业务自绘滚动条或阴影。
- `setEnabled(true)` / `reset()` 恢复由库渲染；页面级设置优先于 `scroll-shadow` 全局配置。
- `useTabScrollShadow()` 只能在 `<VueStackTabs>` 的缓存页内部使用，非页面组件同样可以 inject。
