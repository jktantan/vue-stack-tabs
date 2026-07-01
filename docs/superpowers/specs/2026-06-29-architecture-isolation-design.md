# 第二阶段：架构隔离设计

日期：2026-06-29

## 背景

第一阶段已经完成安全和正确性修复。本阶段聚焦库内部架构隔离，解决当前运行时状态散落在模块级单例中的问题，同时保持现有用户 API 兼容。

当前 `src/lib` 中存在几类需要收敛的状态和契约问题：

- `src/lib/hooks/tabPanel/state.ts` 导出多个模块级可变状态，包括 `tabs`、`defaultTabs`、`caches`、`components`、待驱逐集合、`refreshKey`、滚动位置、初始化标记、iframe 刷新 key、`maxTabCount`、`useGlobalScroll`、`sessionPrefix`。
- `src/lib/hooks/useTabActions.ts` 存在模块级 `iframePath`，会被后续挂载或调用覆盖。
- `src/lib/hooks/useTabEventBus.ts` 存在模块级 `mitt()` 单例，并通过字符串 key `tabEmitter` 注入。
- `StackTabs.vue` 与 `TabHeader/index.vue` 之间的 `maximum` 注入也使用字符串 key。
- `useTabPanel.tsx` 存在直接写入 `route.query.__tab` 的逻辑，也有把 `route.query` 引用保存到内部状态的逻辑。
- 公开 API 中，默认导出实际是 Vue plugin，而全局组件名是 `VueStackTabs`，named component 当前是 `StackTab`，需要明确兼容契约。

本项目调整后的核心约束是：**`vue-stack-tabs` 每个 Vue app 只允许一个 `<VueStackTabs>` 实例。** 本阶段不支持多个 tab 容器并存，而是通过单实例 runtime context 消除模块级散落状态，并显式守卫重复实例。

## 目标

1. 把真正运行时状态从模块级单例迁移到单实例 runtime context。
2. 用 typed `InjectionKey` 替代字符串 provide/inject，至少覆盖 runtime context、event bus 和 `maximum`。
3. 明确公开 API 兼容契约：default export 继续是 plugin；`StackTab` 保留；新增或明确 `VueStackTabs` named component alias。
4. 去掉 `route.query` 原地修改，保存 query 时使用不可变拷贝。
5. 对未挂载实例、重复实例、未提供 context 等错误给出清晰错误或警告。
6. 用测试锁定单实例 context、typed injection、query 不可变和公开 API 兼容行为。

## 非目标

本阶段不做以下事情：

- 不支持多个 `<VueStackTabs>` 实例并存。
- 不新增必须传入的 `instanceId` API。
- 不改变 default export 的含义；default export 仍是 plugin。
- 不移除 `StackTab` named export。
- 不全面收窄 `export * from './model/TabModel'` 的所有类型导出。
- 不把 allowlist、denylist、默认值对象等只读常量作为本阶段阻塞范围。
- 不重写 iframe 通信协议。
- 不大改视觉样式。
- 不把 Nuxt 子路径构建产物调整作为本阶段必做项；该项可作为后续发布契约任务。

## 兼容性边界

### 必须保持兼容

现有安装方式继续有效：

```ts
import VueStackTabs from 'vue-stack-tabs'

app.use(VueStackTabs)
```

现有全局组件用法继续有效：

```vue
<VueStackTabs iframe-path="/iframe" />
```

现有 named export 继续保留：

```ts
import {
  StackTab,
  IFrame,
  useTabActions,
  useTabRouter,
  useTabLoading,
  postOpenTab,
  onRefreshRequest,
  MSG_REFRESH,
  MSG_OPEN_TAB,
} from 'vue-stack-tabs'
```

`StackTab` 是兼容 alias，不在本阶段移除。

### 新增或明确的公开契约

为了减少 default import 被误认为组件的歧义，本阶段明确提供组件 named alias：

```ts
import VueStackTabsPlugin, {
  VueStackTabs as VueStackTabsComponent,
} from 'vue-stack-tabs'

app.use(VueStackTabsPlugin)
```

其中：

- `VueStackTabsPlugin` 是用户自定义的 import 名称，来源仍是 default export。
- `VueStackTabs` named export 表示组件。
- `StackTab` 继续指向同一个组件，作为兼容 alias。

插件 options 类型应明确导出，命名建议为：

```ts
export type VueStackTabsPluginOptions = LocaleMessageOption[]
```

如果后续要引入对象形式 options，应另行设计，不在本阶段改变 `app.use(VueStackTabs, options)` 的现有数组语义。

## 方案选择

采用“单实例 runtime context + 默认公开 composable 访问唯一实例”的方案。

该方案不支持多实例并存，但能把当前散落在模块级的运行时状态集中到一个可创建、可注入、可测试、可重置的上下文中。公开 composable 不要求用户传入实例 ID，继续默认操作唯一 `<VueStackTabs>` 实例。

## 架构

### Runtime context

新增内部 runtime context 类型和 factory，建议放在 hooks/tabPanel 相邻的内部模块中，例如：

```text
src/lib/hooks/stackTabsContext.ts
```

该模块负责导出：

- `StackTabsRuntimeContext` 类型。
- `stackTabsContextKey: InjectionKey<StackTabsRuntimeContext>`。
- `maximumKey: InjectionKey<Ref<boolean>>`。
- `createStackTabsRuntimeContext(config)`。
- `useStackTabsRuntimeContext()`。
- `resolveStackTabsRuntimeContext()`。
- 单实例注册和注销逻辑。

`StackTabsRuntimeContext` 至少包含：

```ts
interface StackTabsRuntimeContext {
  tabs: Ref<ITabItem[]>
  defaultTabs: Ref<ITabItem[]>
  caches: ShallowRef<string[]>
  components: Map<string, DefineComponent>
  cacheIdsToEvict: Set<string>
  tabIdsToEvict: Set<string>
  refreshKey: Ref<number>
  scrollPositionsByPageId: Map<string, Map<string, { top: number; left: number }>>
  isInitialized: Ref<boolean>
  iframeRefreshKeys: Ref<Record<string, number>>
  maxTabCount: Ref<number>
  useGlobalScroll: Ref<boolean>
  sessionPrefix: Ref<string>
  iframePath: Ref<string>
  eventBus: Emitter<TabEventPayloadMap>
}
```

内部实现可以根据现有代码便利性选择 `Ref` 或 getter/setter 封装，但对调用方应体现“通过 context 访问状态”，而不是直接读写模块级变量。

### 单实例注册

`<VueStackTabs>` 在 `setup()` 中创建 runtime context，并注册为当前 Vue app 的唯一有效实例。

重复实例策略：

- 开发环境：第二个 `<VueStackTabs>` 注册时抛出错误。
- 生产环境：打印 `console.warn`，保持第一个 context 为唯一有效 context，后续实例不覆盖全局 resolver。

错误信息应明确：

```text
VueStackTabs only supports one <VueStackTabs> instance per Vue app.
```

为了避免生产环境中后续实例污染状态，重复实例在生产环境不得覆盖：

- `iframePath`
- `sessionPrefix`
- `maxTabCount`
- `useGlobalScroll`
- `eventBus`
- tab/cache/page 状态

### Provide / inject

`<VueStackTabs>` 负责 provide：

```ts
provide(stackTabsContextKey, context)
provide(maximumKey, maximum)
```

内部组件和 hooks 通过 typed key 或 context resolver 获取依赖：

- `PageLoading.vue` 监听 `context.eventBus` 的 `PAGE_LOADING`。
- `TabHeaderItem.vue` 监听 `context.eventBus` 的 `TAB_ACTIVE`。
- `StackTabs.vue` 监听 `FORWARD`、`BACKWARD`、`REFRESH_IFRAME_POSTMESSAGE`。
- `TabHeader/index.vue` 通过 `maximumKey` 获取最大化状态。
- `useTabPanel.tsx`、`useTabRouter.ts`、`useTabActions.ts`、`useTabLoading.ts` 通过 context resolver 访问状态和事件。

`useTabEventBus.ts` 不再创建模块级 `mitt()`。它保留事件类型定义，并通过 runtime context 返回 event bus：

```ts
export const useTabEmitter = (): Emitter<TabEventPayloadMap> => {
  return resolveStackTabsRuntimeContext().eventBus
}
```

### Composable resolver 规则

公开 composable 的 context 定位规则：

1. 如果当前组件树能 inject 到 `stackTabsContextKey`，使用注入 context。
2. 否则使用唯一注册的默认 context。
3. 如果默认 context 不存在，抛出清晰错误。

错误信息建议：

```text
VueStackTabs runtime context is not available. Render <VueStackTabs> before using vue-stack-tabs composables.
```

这保持现有页面级用法：

```ts
const { openTab } = useTabActions()
```

用户不需要传 `instanceId`，因为本库只允许一个实例。

## 状态迁移范围

### 必须迁移到 context

以下运行时状态必须从模块级可变导出迁移到 context：

- `tabs`
- `defaultTabs`
- `caches`
- `components`
- `cacheIdsToEvict`
- `tabIdsToEvict`
- `refreshKey`
- `scrollPositionsByPageId`
- `isInitialized`
- `iframeRefreshKeys`
- `maxTabCount`
- `useGlobalScroll`
- `sessionPrefix`
- `iframePath`
- `eventBus`

### 可保留为模块级只读常量

以下当前更像只读规则或默认模板，不作为本阶段阻塞范围：

- URL allowlist / reserved query key set。
- postMessage type allowlist。
- i18n dangerous key denylist。
- `DEFAULT_TAB_INFO` 这类默认模板对象。

如果实现中顺手将其标记为 readonly，不应扩大行为范围，也不应改变公开 API。

## 数据流

目标数据流：

```text
VueStackTabs
  ├─ createStackTabsRuntimeContext(props/config)
  ├─ register as the single runtime context
  ├─ provide(stackTabsContextKey, context)
  ├─ provide(maximumKey, maximum)
  └─ context.eventBus
       ├─ PageLoading.vue 监听 PAGE_LOADING
       ├─ TabHeaderItem.vue 监听 TAB_ACTIVE
       ├─ StackTabs.vue 监听 FORWARD/BACKWARD/REFRESH_IFRAME_POSTMESSAGE
       ├─ useTabPanel.tsx emit TAB_ACTIVE/FORWARD/REFRESH_IFRAME_POSTMESSAGE
       ├─ useTabRouter.ts emit FORWARD/BACKWARD
       └─ useTabLoading.ts emit PAGE_LOADING
```

`evict.ts`、`scroll.ts`、`session.ts` 不再直接导入模块级状态。它们应改为以下任一模式：

1. 接收 `StackTabsRuntimeContext` 参数；或
2. 调用内部 context resolver。

优先选择能让函数测试更简单的方式。对纯工具逻辑，优先显式传入 context 或所需状态；对 composable 内部逻辑，可使用 resolver。

## route.query 不可变处理

必须移除直接写入当前 route query 的逻辑：

```ts
route.query.__tab = encodeTabInfo(tabInfo)
```

改为创建新 query 对象：

```ts
const nextQuery = {
  ...route.query,
  __tab: encodeTabInfo(tabInfo),
}
```

如果需要同步 URL，应通过 router 导航 API 完成，例如 `router.replace({ query: nextQuery })`，而不是修改 `route.query`。

保存到 tab/page 内部状态时，不得保存 `route.query` 原始引用。应保存浅拷贝：

```ts
query: { ...route.query }
```

如果实现中需要保留数组 query 值，应对数组值做浅拷贝，避免内部状态和 router query 共享数组引用。

## 错误处理

### 未挂载实例

在 runtime context 不存在时调用公开 composable，应抛出清晰错误：

```text
VueStackTabs runtime context is not available. Render <VueStackTabs> before using vue-stack-tabs composables.
```

不应继续依赖 `inject(...) as ...` 后续产生难以定位的 undefined 错误。

### 重复实例

第二个 `<VueStackTabs>` 实例注册时：

- 开发环境抛错。
- 生产环境 warn，并保持第一个 context 不变。

### plugin install 和组件实例

`app.use(VueStackTabs)` 仍负责：

- 注册全局组件 `VueStackTabs`。
- 安装 i18n。
- 提供插件级配置。

runtime context 的创建发生在 `<VueStackTabs>` 组件实例中。因此：

- 只安装 plugin 但不渲染组件时，composable 不能操作 tab。
- 渲染组件后，composable 操作唯一 runtime context。
- 本地导入组件也可创建 runtime context，但文档仍推荐 plugin install。

## 公开 API 和文档要求

文档应明确：

1. 每个 Vue app 只支持一个 `<VueStackTabs>` 实例。
2. default import 是 plugin，不是组件。
3. 推荐安装方式继续是：

```ts
import VueStackTabs from 'vue-stack-tabs'

app.use(VueStackTabs)
```

4. 如果需要本地组件导入，推荐：

```ts
import { VueStackTabs as VueStackTabsComponent } from 'vue-stack-tabs'
```

5. `StackTab` 保留为兼容 alias。
6. CSS 推荐入口应统一为一个主路径，另一个路径保留兼容。
7. Nuxt module 通过 Vue plugin 注册全局组件，而不是 Nuxt `addComponent` 直接注册。

## 测试计划

### Runtime context

新增或更新测试，覆盖：

- `createStackTabsRuntimeContext()` 创建完整状态。
- context 中 event bus 是 typed emitter。
- 未注册 context 时，公开 composable 抛出清晰错误。
- 重复实例在开发环境抛错。
- 重复实例在生产环境 warn 且不覆盖第一个 context。
- context 注销后，不残留默认 context。

### typed InjectionKey

覆盖：

- `tabEmitter` 不再依赖字符串 key。
- `maximum` 不再依赖字符串 key。
- 组件测试中的 `global.provide` 使用 typed key。

### route.query 不可变

覆盖：

- 不再写入 `route.query.__tab`。
- 存入 tab/page 状态的是 query 拷贝。
- 修改内部 tab/page query 不影响原始 `route.query`。

### 公开 API 兼容

覆盖：

- default export 仍可作为 Vue plugin 安装。
- `StackTab` named export 保留。
- `VueStackTabs` named component alias 指向同一组件。
- `VueStackTabsPluginOptions` 类型导出存在。

## 验证命令

实现完成后至少运行项目现有脚本中的测试、类型检查和构建。根据 `package.json` 实际脚本调整，目标等价于：

```bash
pnpm test
pnpm type-check
pnpm build
```

如果某个脚本不存在，应使用项目中对应的实际命令，并在结果中说明替代关系。

## 实施顺序建议

1. 新增 runtime context 类型、factory、typed keys 和单实例注册守卫。
2. 将 `useTabEventBus.ts` 改为从 context 获取 emitter。
3. 将 `tabPanel/state.ts` 的运行时状态迁移到 context。
4. 改造 `evict.ts`、`scroll.ts`、`session.ts`、`useTabPanel.tsx` 读取 context。
5. 改造 `useTabActions.ts` 的 `iframePath`，由 context 持有。
6. 改造 `useTabRouter.ts`、`useTabLoading.ts` 使用 context emitter。
7. 改造 `maximum` 注入为 typed key。
8. 去掉 `route.query` 原地修改和 query 引用保存。
9. 明确 `src/lib/index.ts` 的 named export alias 和 plugin options 类型。
10. 更新 README / Nuxt 文档中的单实例和导出契约说明。
11. 补齐测试并运行验证命令。

## 风险和缓解

### 风险：公开 composable 在组件渲染前被调用

缓解：抛出清晰错误，文档说明必须先渲染 `<VueStackTabs>`。

### 风险：生产环境重复实例导致页面异常

缓解：生产环境只 warn，不覆盖第一个 context，避免后续实例污染状态。

### 风险：状态迁移过程中行为回归

缓解：优先保持原函数名和返回结构；迁移前后用现有测试和新增 context 测试锁定行为。

### 风险：typed key 影响测试挂载

缓解：测试统一从内部 key 模块导入 typed key，使用 computed property provide。

### 风险：query 拷贝改变数组 query 行为

缓解：保留 Vue Router 合法 query 值，数组值需要浅拷贝，不做字符串化收窄。
