# 滚动位置

通过设置滚动元素，已经缓存的页签在重新激活时，将会保持滚动位置。

## 滚动策略

`pageScroll` 决定每个页签内容区由谁负责滚动，默认 `'none'`：

| 值          | 行为                                          |
| ----------- | --------------------------------------------- |
| `'native'`  | 库内 wrapper 使用原生滚动（`overflow: auto`） |
| `'none'`    | 库不接管滚动，由页面自己处理（默认）          |
| `Component` | 传入自定义滚动组件，由它接管滚动              |

### 库内原生滚动

```vue:line-numbers
<vue-stack-tabs iframe-path="/iframe" page-scroll="native" />
```

适合内容直接铺在页面里、由库统一保存滚动位置的场景。

### 页面自己处理滚动

默认 `'none'`：wrapper 为 `overflow: hidden`，库不监听主滚动源。页面可以用 `data-stack-tab-scroll` / `addScrollTarget` 标记原生滚动容器；如果页面里是自定义滚动组件，用 `useTabPageScroll` 把真实滚动源注册给库，位置记忆和阴影才会继续工作。

```vue:line-numbers
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useTabPageScroll } from 'vue-stack-tabs'

const pageScroll = useTabPageScroll()
const scrollElement = ref<HTMLElement | null>(null)

onMounted(() => pageScroll.attach(scrollElement.value))
onBeforeUnmount(() => pageScroll.detach())
</script>

<template>
  <div ref="scrollElement" class="page-scroll">
    <slot />
  </div>
</template>
```

虚拟滚动、BetterScroll 等命令式组件可以直接注册适配器：

```ts
pageScroll.attach({
  getPosition: () => ({ top, left }),
  setPosition: (position) => {
    top = position.top
    left = position.left
  },
  getMetrics: () => ({ scrollTop: top, scrollHeight, clientHeight }),
  onScroll: (listener) => {
    // 订阅自己的滚动事件
    return () => {
      // 取消订阅
    }
  }
})
```

页面内注册的滚动源优先级最高：`useTabPageScroll` > `pageScroll` 组件 > 原生 wrapper。

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

## 自定义滚动组件

通过 `page-scroll` 传入自己的滚动组件（例如 Element Plus 的 `ElScrollbar`），由它承载每个页签的内容区滚动。组件渲染在**每个缓存页 wrapper 内部**，因此每个页签仍然独立记忆滚动位置。

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
<vue-stack-tabs iframe-path="/iframe" :page-scroll="PageScroll" />
```

自定义滚动组件需要满足：

1. 渲染默认插槽——库把页面 vnode 作为插槽内容传入。
2. 根元素填满父容器（`height: 100%`）。
3. 通过 `expose` 暴露真实滚动元素 `scrollElement`。

传入滚动组件后 wrapper 恒为 `overflow: hidden`。`PageLoading` 位于滚动容器外层，保证遮罩覆盖整个内容区。

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

内容区上下阴影由库根据主滚动容器自动计算。`scroll-shadow` 默认 `true`；传 `false` 同时关闭上下两侧，也可以传对象单独关闭某一侧（未声明的一侧默认启用）：

```vue:line-numbers
<!-- 上下两侧都关闭 -->
<vue-stack-tabs iframe-path="/iframe" :scroll-shadow="false" />

<!-- 只关闭顶部阴影，底部阴影仍由库渲染 -->
<vue-stack-tabs iframe-path="/iframe" :scroll-shadow="{ top: false }" />
```

> 对象配置需要整体替换才会触发更新；直接修改同一个对象的属性不会被侦听。

页面内的任意组件（包括包在 page 内容外的布局组件）都可以读取当前应该显示哪个方向的阴影，并手动覆盖开关：

```vue:line-numbers
<script setup lang="ts">
import { useTabScrollShadow } from 'vue-stack-tabs'

const shadow = useTabScrollShadow()

// 'none' | 'top' | 'bottom' | 'both'
console.log(shadow.state.value)

// 手动关闭当前页阴影；state 仍会继续更新
shadow.setEnabled(false)

// 只关闭底部阴影，顶部阴影仍由库渲染
shadow.setEnabled({ bottom: false })

// 读取当前两侧的渲染开关（已解析为确定的布尔值）
console.log(shadow.enabledSides.value) // { top: true, bottom: false }

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

- `setEnabled(false)` / `setEnabled({ top: false })` 只关闭库的阴影渲染，`state` 仍然按滚动位置更新，适合业务自绘滚动条或阴影。
- `setEnabled(true)` / `setEnabled({ top: true, bottom: true })` / `reset()` 恢复由库渲染；页面级设置优先于 `scroll-shadow` 全局配置。
- `enabled` 在任一侧启用时为 `true`；需要精确判断某一侧时读取 `enabledSides`（`{ top, bottom }`）。
- `useTabScrollShadow()` 只能在 `<VueStackTabs>` 的缓存页内部使用，非页面组件同样可以 inject。
- `pageScroll="none"` 且没有注册滚动源时，阴影状态保持 `none`；用 `useTabPageScroll` 注册后会重新计算。
