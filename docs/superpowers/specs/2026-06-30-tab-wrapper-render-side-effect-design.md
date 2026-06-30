# TabWrapper Render 副作用最小风险修正设计

日期：2026-06-30

## 背景

当前 `StackKeepAlive.vue` 在模板表达式中直接调用 `tabWrapper(route, Component)`：

```vue
<component
  :is="tabWrapper(route, Component)"
  :key="`${activeCacheKey}-${refreshKey}`"
  :vnode="Component"
  @on-loaded="emitLoaded"
/>
```

`tabWrapper` 内部调用 `useTabPanel().addPage(route, component)`。`addPage` 不是纯函数，它会进入 `updatePageState` / `resolvePageComponent`，并可能更新 `caches`、`activeCacheKey`、tab active 状态和 pages 栈。

由于 `caches` 和 `activeCacheKey` 又被当前模板读取，进入新地址时会出现以下链路：

```text
router-view 渲染 route + Component
  → 模板表达式调用 tabWrapper
  → addPage 更新 caches / activeCacheKey
  → StackKeepAlive 响应式重渲染
  → 模板表达式再次调用 tabWrapper
```

当前 `addPage` 已通过 `lastRouteKey` 做二级幂等保护，但 render 阶段仍然包含副作用，容易造成多次调用、调试噪音和后续维护风险。

## 目标

本次只做最小风险修正：

1. 移除 `StackKeepAlive.vue` 模板表达式中的 `tabWrapper(route, Component)` 副作用调用。
2. 保留 `addPage`、`updatePageState`、`resolvePageComponent`、refresh、forward、backward、evict、session restore 等现有核心逻辑。
3. 让 `addPage` 只在 route 或 router-view 提供的 Component 实际变化时调用。
4. 保留 `lastRouteKey` 作为防重复的第二层保护。

## 非目标

本次不处理以下问题：

- 裸路由无 `__tab` 时创建 `undefined` / random tab 的行为。
- `updatePageState` 只按 `path` 判断当前页面的策略。
- `useTabPanel` 状态机拆分或架构重构。
- iframe 管理逻辑重构。
- session restore、refresh、browser back 修复逻辑重写。

## 方案

新增一个内部组件 `StackCacheRenderer.vue`，把 route/component 到 wrapper component 的同步逻辑从模板表达式移动到 watcher 中。

### 组件职责

#### `StackKeepAlive.vue`

继续负责：

- 渲染 `<router-view>`；
- 提供 `<transition>`；
- 提供 `<keep-alive :include="caches">`；
- 转发页面 loaded 事件；
- 将 `route` 和 `Component` 传给内部 renderer。

改造后结构类似：

```vue
<router-view v-slot="{ Component, route }">
  <StackCacheRenderer
    :route="route"
    :component="Component"
    v-slot="{ wrappedComponent, activeCacheKey, refreshKey, component }"
  >
    <transition :name="transitionName" appear mode="out-in">
      <keep-alive :include="caches">
        <component
          :is="wrappedComponent"
          :key="`${activeCacheKey}-${refreshKey}`"
          :vnode="component"
          @on-loaded="emitLoaded"
        />
      </keep-alive>
    </transition>
  </StackCacheRenderer>
</router-view>
```

注意：`<component :is="wrappedComponent">` 必须继续作为 `<keep-alive>` 的直接子节点，否则 `keep-alive :include="caches"` 会匹配到中间组件名而不是实际缓存页的 `cacheName`。因此 `StackCacheRenderer` 使用 scoped slot 暴露解析结果，不直接包住动态缓存页。

#### `StackCacheRenderer.vue`

负责：

- 接收 `route` 和 `component` props；
- 从 `useTabPanel()` 获取 `addPage`、`activeCacheKey`、`refreshKey`；
- 用 `shallowRef` 保存当前包装组件；
- 通过 `watch` 在 route/component 变化时调用 `addPage`；
- 模板只读取已缓存的 `wrappedComponent`。

核心逻辑类似：

```ts
const wrappedComponent = shallowRef<DefineComponent>(EmptyPlaceholderComponent as DefineComponent)

watch(
  () => [props.route.fullPath, props.route.query.__tab, props.component] as const,
  () => {
    wrappedComponent.value = addPage(props.route, props.component)
  },
  { immediate: true }
)
```

模板类似：

```vue
<component
  :is="wrappedComponent"
  :key="`${activeCacheKey}-${refreshKey}`"
  :vnode="component"
  @on-loaded="emitLoaded"
/>
```

## 数据流

改造前：

```text
StackKeepAlive render
  → tabWrapper(route, Component)
  → addPage(route, Component)
  → 可能更新 caches / activeCacheKey
  → 触发 StackKeepAlive 再 render
  → tabWrapper 再次执行
```

改造后：

```text
router-view slot props 更新
  → StackCacheRenderer props 更新
  → watch 检测 route.fullPath / __tab / Component 变化
  → addPage(route, Component)
  → wrappedComponent 更新
  → 模板渲染 wrappedComponent
```

普通的 `caches`、`activeCacheKey`、`refreshKey` 响应式更新仍会触发渲染，但不会再因为模板表达式而重新调用 `addPage`。

## 兼容性与影响

### 保持不变

以下逻辑保持不变：

- tab 创建与激活；
- pages 栈维护；
- cacheName 生成；
- keep-alive include 管理；
- `activeCacheKey` 更新；
- `refreshKey` 刷新重建；
- `tId`、`pId`、`_back` 注入；
- `PageLoading` 渲染；
- forward / backward / native browser back 修复；
- evict 与 session restore。

### 行为变化

唯一有意变化是：

> `addPage` 不再因为 `StackKeepAlive` 普通重渲染而执行，只在 route 或 Component 变化时执行。

预期效果：

- 进入新地址时 `tabWrapper` render-time 重复调用消失；
- `addPage` 调用次数减少；
- `lastRouteKey` 仍保留，防止 route key 相同场景下重复进入状态更新；
- refresh 导致的组件 key 变化仍然有效。

## 风险与缓解

### 风险 1：首次渲染 wrapper 为空

缓解：`wrappedComponent` 默认使用 `EmptyPlaceholderComponent`，并使用 `watch(..., { immediate: true })` 在组件创建后立即同步。

### 风险 2：route 不变但 Component 引用变化

缓解：watch 源包含 `props.component`，覆盖异步组件 resolve、HMR、路由组件引用变化等场景。

### 风险 3：refresh 行为被误改

缓解：`refreshKey` 仍由 renderer 模板参与动态组件 key，refresh 仍能重建当前缓存页实例；本次不改 `refreshTab` / `refreshAllTabs`。

### 风险 4：现有测试依赖 `StackKeepAlive` 直接调用 `addPage`

缓解：更新测试断言，从“模板表达式直接触发”调整为“内部 renderer 首次挂载触发”。新增测试确认 `activeCacheKey` / `refreshKey` 变化不会再次调用 `addPage`。

## 测试计划

至少覆盖以下测试：

1. 首次渲染会调用 `addPage` 一次，并渲染返回的包装组件。
2. `activeCacheKey` / `refreshKey` 变化时，动态组件 key 仍变化，但不重复调用 `addPage`。
3. route fullPath 变化时，会重新调用 `addPage`。
4. router-view 的 Component 引用变化时，会重新调用 `addPage`。
5. `loaded` 事件仍能从 renderer 透传到 `StackKeepAlive` 父级。

## 验收标准

1. `StackKeepAlive.vue` 模板不再直接调用 `tabWrapper(route, Component)`。
2. 进入新地址时，`addPage` 只因 route/component 变化执行，而不是因普通响应式重渲染执行。
3. 现有 tab、page、cache、refresh、forward/backward 行为保持通过测试。
4. 新增或更新的单元测试能证明本次行为变化。
