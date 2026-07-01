# StackKeepAlive 内部渲染层设计

日期：2026-06-26

## 背景

当前 `StackTabs.vue` 同时承担外层容器、`TabHeader`、页面缓存渲染、iframe 层、postMessage 桥接、初始化和销毁等职责。其中页面缓存渲染部分绑定了库的核心行为：`router-view`、`transition`、`keep-alive`、`addPage(route, Component)`、`activeCacheKey` 和 `refreshKey`。

本次重构采用内部 `StackKeepAlive` 渲染层方案。目标是切清职责边界，降低 `StackTabs.vue` 的复杂度，同时保持所有现有运行时行为不变。

## 决策

新增内部组件：

```text
src/lib/components/StackKeepAlive/StackKeepAlive.vue
```

该组件暂不对外导出，不修改 `src/lib/index.ts`，不新增公共 API 文档。

采用方案 B：内部 `StackKeepAlive` 渲染层，暂不导出。

## 架构

目标结构：

```text
src/lib/
├── StackTabs.vue
├── components/
│   ├── StackKeepAlive/
│   │   └── StackKeepAlive.vue
│   └── TabHeader/
├── hooks/
│   └── useTabPanel.tsx
```

`StackTabs.vue` 保留：

- 根容器样式。
- `TabHeader`。
- 最大化状态。
- 页面切换方向状态 `pageSwitch`。
- iframe 层。
- iframe postMessage。
- 初始化和销毁。
- 对外事件 `onActive` / `onPageLoaded`。

`StackKeepAlive.vue` 负责：

- `router-view` 渲染。
- 页面转场。
- `keep-alive :include="caches"`。
- 调用 `addPage(route, Component)`。
- 绑定 `activeCacheKey` 和 `refreshKey`。
- 页面 loaded 事件转发。

## 组件接口

`StackKeepAlive` 是内部组件，使用方式：

```vue
<StackKeepAlive
  :transition-name="pageSwitch"
  @loaded="onComponentLoaded"
/>
```

### Props

```ts
interface StackKeepAliveProps {
  transitionName?: string
}
```

### Emits

```ts
interface StackKeepAliveEmits {
  loaded: []
}
```

### 内部依赖

`StackKeepAlive` 内部直接调用 `useTabPanel()`：

```ts
const {
  caches,
  refreshKey,
  activeCacheKey,
  addPage
} = useTabPanel()
```

不从 `StackTabs.vue` 传入 `caches`、`refreshKey`、`activeCacheKey` 或 `addPage`，避免把内部状态拆成一串 props。

## 数据流

页面渲染流程保持不变：

1. Vue Router 渲染当前 route。
2. `StackKeepAlive` 通过 `router-view` 获取 `{ Component, route }`。
3. 调用 `addPage(route, Component)`。
4. `useTabPanel.addPage` 内部继续执行：
   - `updatePageState(route)`。
   - `resolvePageComponent(...)`。
   - 更新 `activeCacheKey`。
   - 维护 `components`。
   - 维护 `caches`。
5. `keep-alive` 根据 `caches` 决定保留哪些页面实例。
6. 动态组件继续使用 `activeCacheKey` 和 `refreshKey` 组成 key 来保持刷新机制。

## 行为保持要求

本次重构必须保持以下行为完全不变：

1. `keep-alive` 外层结构保持：

```vue
<router-view>
  <transition>
    <keep-alive>
      <component />
    </keep-alive>
  </transition>
</router-view>
```

2. `transition` 参数保持：

```vue
appear
mode="out-in"
```

3. 动态组件 key 保持：

```ts
`${activeCacheKey}-${refreshKey}`
```

4. 动态组件继续接收：

```vue
:vnode="Component"
```

5. 子组件触发的 `on-loaded` 继续转发为 `StackTabs.vue` 的 `onPageLoaded`。

6. 不修改缓存核心算法，包括：
   - `useTabPanel.tsx`
   - `tabPanel/state.ts`
   - `tabPanel/evict.ts`
   - `useTabRouter.ts`

如实现中发现类型或导入必须调整，只允许最小范围改动。

## 错误处理与边界

本次不新增运行时错误处理逻辑，避免改变行为。

现有边界保持不变：

- 如果 `Component` 不存在，由 `addPage(route, Component)` 返回空占位组件。
- 缓存驱逐、刷新、页面恢复仍由 `useTabPanel` 处理。
- `router-view` 的 slot 数据保持原样传入。

错误边界仍属于现有 `useTabPanel` 核心逻辑，不在 `StackKeepAlive` 内重新实现。

## 测试策略

这是行为保持型重构，测试重点是防止缓存渲染行为变化。

建议最小验证：

1. 单元或组件测试：
   - 页面首次进入能触发 loaded。
   - 切换 tab 后缓存页面仍保留。
   - refresh 后当前页面重建。
   - 同一路由多次打开仍为独立页面实例。

2. 已有测试回归：
   - `pnpm test`
   - `pnpm type-check`
   - `pnpm lint:check` 或项目已有 lint 流程。

3. 打包验证：
   - `pnpm run lib:build`
   - 必要时运行 `pnpm run test:packaged`。

4. 手动关键路径：
   - 打开多个 tab。
   - tab 间切换。
   - 同一路由多实例。
   - forward/backward。
   - refresh 当前 tab。
   - iframe tab 不受影响。

## 非目标

本次不做：

- 不对外导出 `StackKeepAlive`。
- 不新增公共文档页。
- 不拆 `StackIframeLayer`。
- 不调整缓存算法。
- 不重命名 `StackTab` / `VueStackTabs`。
- 不修改 package exports。
- 不改 Nuxt 模块集成方式。

## 自审记录

- 无占位符或待定项。
- 设计范围聚焦于内部职责拆分。
- 组件接口与“不对外导出”的决策一致。
- 行为保持要求覆盖 `router-view`、`transition`、`keep-alive`、key、事件转发和核心算法边界。
