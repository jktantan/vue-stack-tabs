# Architecture Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `vue-stack-tabs` 的运行时状态从模块级单例迁移到单实例 runtime context，明确每个 Vue app 只允许一个 `<VueStackTabs>` 实例，同时保持现有公开 API 兼容。

**Architecture:** 新增内部 `StackTabsRuntimeContext`，由唯一 `<VueStackTabs>` 实例创建、注册并 provide。内部 hooks、event bus、tab panel helper 全部通过 typed `InjectionKey` 或 context resolver 访问状态；重复实例在开发环境抛错，在生产环境 warn 且不覆盖第一个 context。

**Tech Stack:** Vue 3、TypeScript、Vite、Vitest、@vue/test-utils、happy-dom、mitt、vue-router、vue-i18n-lite。

## Global Constraints

- `vue-stack-tabs` 每个 Vue app 只允许一个 `<VueStackTabs>` 实例。
- 开发环境中重复 `<VueStackTabs>` 实例必须抛出错误：`VueStackTabs only supports one <VueStackTabs> instance per Vue app.`
- 生产环境中重复 `<VueStackTabs>` 实例必须 `console.warn`，并保持第一个 runtime context 不被覆盖。
- 未挂载 `<VueStackTabs>` 时调用公开 composable 必须抛出错误：`VueStackTabs runtime context is not available. Render <VueStackTabs> before using vue-stack-tabs composables.`
- default export 继续是 Vue plugin，`app.use(VueStackTabs)` 保持可用。
- `StackTab` named export 必须保留。
- 新增或明确 `VueStackTabs` named component alias，指向 `StackTabs.vue` 组件。
- 不新增必须传入的 `instanceId` API。
- 不支持多个 `<VueStackTabs>` 实例并存。
- 不全面收窄 `export * from './model/TabModel'`。
- 不把 URL allowlist、postMessage allowlist、i18n denylist、`DEFAULT_TAB_INFO` 这类只读常量作为本阶段阻塞范围。
- 不重写 iframe 通信协议。
- 不把 Nuxt 子路径构建产物调整作为本阶段必做项。
- 运行时状态必须迁移到单实例 runtime context：`tabs`、`defaultTabs`、`caches`、`components`、`cacheIdsToEvict`、`tabIdsToEvict`、`refreshKey`、`scrollPositionsByPageId`、`isInitialized`、`iframeRefreshKeys`、`maxTabCount`、`useGlobalScroll`、`sessionPrefix`、`iframePath`、`eventBus`。
- `route.query` 不得原地修改；保存到内部 tab/page 状态时必须使用不可变拷贝。
- 代码变更必须遵循 TDD：先写失败测试，再实现最小代码。
- 完成前必须运行：`pnpm test`、`pnpm type-check`、`pnpm build`、`pnpm run lib:build`。
- 不要提交或推送，除非用户明确要求；若用户要求提交，提交消息遵循 `<type>: <description>`。

---

## File Structure

### 新增文件

- Create: `src/lib/hooks/stackTabsContext.ts`
  - 单实例 runtime context 的类型、typed injection keys、factory、resolver、注册和注销逻辑。
  - 不从 `src/lib/index.ts` 对外导出。

- Create: `src/lib/hooks/stackTabsContext.spec.ts`
  - 覆盖 context factory、resolver、重复实例守卫、未挂载错误、注销逻辑。

### 修改文件

- Modify: `src/lib/hooks/tabPanel/state.ts`
  - 从模块级可变导出改为 `createTabPanelRuntimeState()` factory。
  - 保留 `SESSION_TAB_NAME` 常量。

- Modify: `src/lib/hooks/tabPanel/evict.ts`
  - 从直接导入模块级状态改为 `createTabPanelEviction(context)`。
  - 返回 `markCacheForEviction`、`markTabPagesForEviction`、`markTabPagesForEvictionOnly`、`addCache`、`removeCache`、`evictPageCache`、`evictMarkedCaches`。

- Modify: `src/lib/hooks/tabPanel/scroll.ts`
  - 从直接导入模块级 `scrollPositionsByPageId` 改为 `createTabPanelScroll(context)`。
  - 返回 `restoreScroller`、`saveScroller`、`removeScroller`、`addPageScroller`。

- Modify: `src/lib/hooks/tabPanel/session.ts`
  - 从直接导入模块级 `sessionPrefix` 改为 `createTabPanelSession(context)`。
  - 返回 `getSessionKey`、`saveActiveTabToSession`、`clearSession`、`restoreActiveTabSession`、`restoreTabFromSession`。

- Modify: `src/lib/hooks/useTabEventBus.ts`
  - 移除模块级 `mitt()` 单例。
  - 新增 typed `tabEmitterKey: InjectionKey<Emitter<TabEventPayloadMap>>`。
  - `useTabEmitter()` 优先 inject typed emitter，再回退到 runtime context 的 `eventBus`。
  - 默认 plugin 保留为 no-op 兼容内部安装链路，后续从 `src/lib/index.ts` 移除 `.use(useTabEventBus)`。

- Modify: `src/lib/hooks/useTabPanel.tsx`
  - 通过 `resolveStackTabsRuntimeContext()` 获取状态。
  - 使用 `createTabPanelEviction(context)`、`createTabPanelScroll(context)`、`createTabPanelSession(context)`。
  - 去掉 `route.query.__tab = ...` 原地修改。
  - 保存 route query 时使用拷贝。
  - `destroy()` 清理 context 内状态，不依赖模块级单例。

- Modify: `src/lib/hooks/useTabActions.ts`
  - 移除模块级 `iframePath`。
  - 通过 runtime context 读写 `iframePath.value`。
  - `navigateToTab()` 用不可变 query 创建方式替代 `query['__src'] = ...` 和 `query['__tab'] = ...`。

- Modify: `src/lib/hooks/useTabRouter.ts`
  - 保持公开 API 不变。
  - 依赖 `useTabEmitter()` 和 `useTabPanel()` 的 context 化结果。
  - 写入 optimistic page query 时复制 query，避免保留外部引用。

- Modify: `src/lib/hooks/useTabLoading.ts`
  - 保持公开 API 不变。
  - 依赖 context 化后的 `useTabEmitter()`。

- Modify: `src/lib/StackTabs.vue`
  - 创建 runtime context。
  - 注册单实例 context。
  - typed provide `stackTabsContextKey`、`tabEmitterKey`、`maximumKey`。
  - 开发环境重复实例抛错；生产环境重复实例 warn 后真正 no-op，不初始化 tab 状态、不注册事件监听、不覆盖第一个 context。
  - 卸载时注销 context。
  - 把 `provide('maximum', maximum)` 改为 `provide(maximumKey, maximum)`。

- Modify: `src/lib/components/TabHeader/index.vue`
  - 把 `inject<boolean>('maximum')` 改为 `inject(maximumKey)`。

- Modify: `src/lib/components/TabHeader/index.spec.ts`
  - `global.provide` 从字符串 key 改为 typed key：`[maximumKey]` 和 `[tabEmitterKey]`。

- Modify: `src/lib/hooks/useTabPanel.spec.ts`
  - 测试中显式注册 runtime context，避免依赖旧模块级状态。
  - 增加 `route.query` 不可变测试。

- Modify: `src/lib/hooks/useTabActions.spec.ts`
  - 测试中显式注册 runtime context。
  - 增加 iframe path 来自 context 和 immutable query 测试。

- Modify: `src/lib/hooks/useTabRouter.spec.ts`
  - 验证 optimistic page query 不保留传入 `to.query` 引用。

- Modify: `src/lib/hooks/useTabEventBus.spec.ts`
  - 增加 typed emitter resolver 测试。

- Modify: `src/lib/index.ts`
  - 移除 `useTabEventBus` plugin 安装链路。
  - 导出 `VueStackTabs` named component alias。
  - 导出 `VueStackTabsPluginOptions` 类型。
  - default export 继续是 plugin。

- Modify: `README.md`
  - 明确 default import 是 plugin。
  - 明确每个 Vue app 只支持一个 `<VueStackTabs>` 实例。
  - 明确本地组件导入推荐 `import { VueStackTabs as VueStackTabsComponent } from 'vue-stack-tabs'`。

- Modify: `docs/base/nuxt.md`
  - 明确 Nuxt module 通过 Vue plugin 注册全局组件。
  - 明确仍只支持一个 `<VueStackTabs>` 实例。

---

### Task 1: 新增 runtime context foundation

**Files:**
- Create: `src/lib/hooks/stackTabsContext.ts`
- Create: `src/lib/hooks/stackTabsContext.spec.ts`
- Modify: `src/lib/hooks/tabPanel/state.ts`

**Interfaces:**
- Consumes:
  - `ITabItem` from `src/lib/model/TabModel.ts`
  - `Emitter<TabEventPayloadMap>` from `mitt` and `src/lib/hooks/useTabEventBus.ts`
- Produces:
  - `interface TabPanelRuntimeState`
  - `interface StackTabsRuntimeContext`
  - `const stackTabsContextKey: InjectionKey<StackTabsRuntimeContext>`
  - `const maximumKey: InjectionKey<Ref<boolean>>`
  - `const STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE: string`
  - `const STACK_TABS_DUPLICATE_INSTANCE_MESSAGE: string`
  - `function createTabPanelRuntimeState(): TabPanelRuntimeState`
  - `function createStackTabsRuntimeContext(options?: CreateStackTabsRuntimeContextOptions): StackTabsRuntimeContext`
  - `function registerStackTabsRuntimeContext(context: StackTabsRuntimeContext, options?: RegisterStackTabsRuntimeContextOptions): boolean`
  - `function unregisterStackTabsRuntimeContext(context: StackTabsRuntimeContext): void`
  - `function resolveStackTabsRuntimeContext(): StackTabsRuntimeContext`
  - `function getActiveStackTabsRuntimeContext(): StackTabsRuntimeContext | null`

- [ ] **Step 1: 写 runtime context 失败测试**

Create `src/lib/hooks/stackTabsContext.spec.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE,
  STACK_TABS_DUPLICATE_INSTANCE_MESSAGE,
  createStackTabsRuntimeContext,
  getActiveStackTabsRuntimeContext,
  registerStackTabsRuntimeContext,
  resolveStackTabsRuntimeContext,
  unregisterStackTabsRuntimeContext
} from './stackTabsContext'

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

describe('stackTabsContext', () => {
  beforeEach(() => {
    warnSpy.mockClear()
    const active = getActiveStackTabsRuntimeContext()
    if (active) unregisterStackTabsRuntimeContext(active)
  })

  it('createStackTabsRuntimeContext 创建完整的空运行时状态', () => {
    const context = createStackTabsRuntimeContext({
      iframePath: '/iframe',
      maxTabCount: 20,
      useGlobalScroll: true,
      sessionPrefix: 'admin:'
    })

    expect(context.tabs.value).toEqual([])
    expect(context.defaultTabs.value).toEqual([])
    expect(context.caches.value).toEqual([])
    expect(context.components.size).toBe(0)
    expect(context.cacheIdsToEvict.size).toBe(0)
    expect(context.tabIdsToEvict.size).toBe(0)
    expect(context.refreshKey.value).toBe(0)
    expect(context.scrollPositionsByPageId.size).toBe(0)
    expect(context.isInitialized.value).toBe(false)
    expect(context.iframeRefreshKeys.value).toEqual({})
    expect(context.maxTabCount.value).toBe(20)
    expect(context.useGlobalScroll.value).toBe(true)
    expect(context.sessionPrefix.value).toBe('admin:')
    expect(context.iframePath.value).toBe('/iframe')
    expect(typeof context.eventBus.emit).toBe('function')
  })

  it('resolveStackTabsRuntimeContext 在没有注册实例时抛出清晰错误', () => {
    expect(() => resolveStackTabsRuntimeContext()).toThrow(STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE)
  })

  it('开发环境重复注册实例时抛错且保留第一个 context', () => {
    const first = createStackTabsRuntimeContext({ iframePath: '/first' })
    const second = createStackTabsRuntimeContext({ iframePath: '/second' })

    expect(registerStackTabsRuntimeContext(first, { isProduction: false })).toBe(true)
    expect(() => registerStackTabsRuntimeContext(second, { isProduction: false })).toThrow(
      STACK_TABS_DUPLICATE_INSTANCE_MESSAGE
    )
    expect(resolveStackTabsRuntimeContext()).toBe(first)
  })

  it('生产环境重复注册实例时 warn 且不覆盖第一个 context', () => {
    const first = createStackTabsRuntimeContext({ iframePath: '/first' })
    const second = createStackTabsRuntimeContext({ iframePath: '/second' })

    expect(registerStackTabsRuntimeContext(first, { isProduction: true })).toBe(true)
    expect(registerStackTabsRuntimeContext(second, { isProduction: true })).toBe(false)

    expect(warnSpy).toHaveBeenCalledWith(STACK_TABS_DUPLICATE_INSTANCE_MESSAGE)
    expect(resolveStackTabsRuntimeContext()).toBe(first)
    expect(resolveStackTabsRuntimeContext().iframePath.value).toBe('/first')
  })

  it('注销当前 context 后 resolver 回到不可用状态', () => {
    const context = createStackTabsRuntimeContext()

    registerStackTabsRuntimeContext(context, { isProduction: false })
    unregisterStackTabsRuntimeContext(context)

    expect(getActiveStackTabsRuntimeContext()).toBeNull()
    expect(() => resolveStackTabsRuntimeContext()).toThrow(STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm test -- src/lib/hooks/stackTabsContext.spec.ts
```

Expected: FAIL，原因是 `src/lib/hooks/stackTabsContext.ts` 不存在，或导出的函数不存在。

- [ ] **Step 3: 将 `state.ts` 改为 factory**

Replace `src/lib/hooks/tabPanel/state.ts` with:

```ts
/**
 * tabPanel/state - 标签页运行时状态 factory
 *
 * 职责：创建 tabs、caches、components、驱逐集合、滚动位置等运行时状态。
 * 注意：本文件不导出模块级可变状态；每个 Vue app 只有一个 StackTabsRuntimeContext 持有这些状态。
 */
import type { DefineComponent, Ref, ShallowRef } from 'vue'
import { ref, shallowRef } from 'vue'
import type { ITabItem } from '../../model/TabModel'

export interface ScrollPosition {
  top: number
  left: number
}

export interface TabPanelRuntimeState {
  tabs: Ref<ITabItem[]>
  defaultTabs: Ref<ITabItem[]>
  caches: ShallowRef<string[]>
  components: Map<string, DefineComponent>
  cacheIdsToEvict: Set<string>
  tabIdsToEvict: Set<string>
  refreshKey: Ref<number>
  scrollPositionsByPageId: Map<string, Map<string, ScrollPosition>>
  isInitialized: Ref<boolean>
  iframeRefreshKeys: Ref<Record<string, number>>
  maxTabCount: Ref<number>
  useGlobalScroll: Ref<boolean>
  sessionPrefix: Ref<string>
}

/** sessionStorage 中存储当前激活标签的 key 后缀 */
export const SESSION_TAB_NAME = 'stacktab-active-tab'

export const createTabPanelRuntimeState = (): TabPanelRuntimeState => ({
  tabs: ref<ITabItem[]>([]),
  defaultTabs: ref<ITabItem[]>([]),
  caches: shallowRef<string[]>([]),
  components: new Map<string, DefineComponent>(),
  cacheIdsToEvict: new Set<string>(),
  tabIdsToEvict: new Set<string>(),
  refreshKey: ref<number>(0),
  scrollPositionsByPageId: new Map<string, Map<string, ScrollPosition>>(),
  isInitialized: ref<boolean>(false),
  iframeRefreshKeys: ref<Record<string, number>>({}),
  maxTabCount: ref<number>(0),
  useGlobalScroll: ref<boolean>(false),
  sessionPrefix: ref<string>('')
})
```

- [ ] **Step 4: 新增 `stackTabsContext.ts` 最小实现**

Create `src/lib/hooks/stackTabsContext.ts`:

```ts
import type { DefineComponent, InjectionKey, Ref, ShallowRef } from 'vue'
import { hasInjectionContext, inject, ref } from 'vue'
import type { Emitter } from 'mitt'
import mitt from 'mitt'
import type { ITabItem } from '../model/TabModel'
import type { TabEventPayloadMap } from './useTabEventBus'
import { createTabPanelRuntimeState } from './tabPanel/state'
import type { ScrollPosition } from './tabPanel/state'

export const STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE =
  'VueStackTabs runtime context is not available. Render <VueStackTabs> before using vue-stack-tabs composables.'

export const STACK_TABS_DUPLICATE_INSTANCE_MESSAGE =
  'VueStackTabs only supports one <VueStackTabs> instance per Vue app.'

export interface StackTabsRuntimeContext {
  tabs: Ref<ITabItem[]>
  defaultTabs: Ref<ITabItem[]>
  caches: ShallowRef<string[]>
  components: Map<string, DefineComponent>
  cacheIdsToEvict: Set<string>
  tabIdsToEvict: Set<string>
  refreshKey: Ref<number>
  scrollPositionsByPageId: Map<string, Map<string, ScrollPosition>>
  isInitialized: Ref<boolean>
  iframeRefreshKeys: Ref<Record<string, number>>
  maxTabCount: Ref<number>
  useGlobalScroll: Ref<boolean>
  sessionPrefix: Ref<string>
  iframePath: Ref<string>
  eventBus: Emitter<TabEventPayloadMap>
}

export interface CreateStackTabsRuntimeContextOptions {
  iframePath?: string
  maxTabCount?: number
  useGlobalScroll?: boolean
  sessionPrefix?: string
}

export interface RegisterStackTabsRuntimeContextOptions {
  isProduction?: boolean
}

export const stackTabsContextKey: InjectionKey<StackTabsRuntimeContext> = Symbol('stackTabsContext')
export const maximumKey: InjectionKey<Ref<boolean>> = Symbol('stackTabsMaximum')

let activeRuntimeContext: StackTabsRuntimeContext | null = null

export const createStackTabsRuntimeContext = (
  options: CreateStackTabsRuntimeContextOptions = {}
): StackTabsRuntimeContext => {
  const state = createTabPanelRuntimeState()

  return {
    ...state,
    maxTabCount: ref(options.maxTabCount ?? state.maxTabCount.value),
    useGlobalScroll: ref(options.useGlobalScroll ?? state.useGlobalScroll.value),
    sessionPrefix: ref(options.sessionPrefix ?? state.sessionPrefix.value),
    iframePath: ref(options.iframePath ?? ''),
    eventBus: mitt<TabEventPayloadMap>()
  }
}

export const getActiveStackTabsRuntimeContext = (): StackTabsRuntimeContext | null => activeRuntimeContext

export const registerStackTabsRuntimeContext = (
  context: StackTabsRuntimeContext,
  options: RegisterStackTabsRuntimeContextOptions = {}
): boolean => {
  if (!activeRuntimeContext) {
    activeRuntimeContext = context
    return true
  }

  if (activeRuntimeContext === context) return true

  const isProduction = options.isProduction ?? import.meta.env.PROD
  if (isProduction) {
    console.warn(STACK_TABS_DUPLICATE_INSTANCE_MESSAGE)
    return false
  }

  throw new Error(STACK_TABS_DUPLICATE_INSTANCE_MESSAGE)
}

export const unregisterStackTabsRuntimeContext = (context: StackTabsRuntimeContext): void => {
  if (activeRuntimeContext === context) activeRuntimeContext = null
}

export const resolveStackTabsRuntimeContext = (): StackTabsRuntimeContext => {
  const injected = hasInjectionContext() ? inject(stackTabsContextKey, null) : null
  const context = injected ?? activeRuntimeContext

  if (!context) throw new Error(STACK_TABS_CONTEXT_UNAVAILABLE_MESSAGE)

  return context
}
```

- [ ] **Step 5: 运行 context 测试确认通过**

Run:

```bash
pnpm test -- src/lib/hooks/stackTabsContext.spec.ts
```

Expected: PASS。

- [ ] **Step 6: 运行类型检查观察后续迁移错误**

Run:

```bash
pnpm type-check
```

Expected: FAIL。当前 `useTabPanel.tsx`、`evict.ts`、`scroll.ts`、`session.ts` 仍导入旧的 `tabs`、`caches`、`sessionPrefix` 等模块级导出。下一任务会修复这些错误。

- [ ] **Step 7: Checkpoint**

Do not commit unless the user explicitly asks. If commits are authorized, run:

```bash
git add src/lib/hooks/stackTabsContext.ts src/lib/hooks/stackTabsContext.spec.ts src/lib/hooks/tabPanel/state.ts
git commit -m "refactor: add stack tabs runtime context"
```

---

### Task 2: typed event bus resolver

**Files:**
- Modify: `src/lib/hooks/useTabEventBus.ts`
- Modify: `src/lib/hooks/useTabEventBus.spec.ts`

**Interfaces:**
- Consumes:
  - `resolveStackTabsRuntimeContext(): StackTabsRuntimeContext` from `src/lib/hooks/stackTabsContext.ts`
- Produces:
  - `const tabEmitterKey: InjectionKey<Emitter<TabEventPayloadMap>>`
  - `function useTabEmitter(): Emitter<TabEventPayloadMap>`
  - default plugin object with `install(app: App): void` retained as no-op compatibility until `src/lib/index.ts` is updated

- [ ] **Step 1: 扩展 event bus 测试**

Replace `src/lib/hooks/useTabEventBus.spec.ts` with:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createStackTabsRuntimeContext,
  getActiveStackTabsRuntimeContext,
  registerStackTabsRuntimeContext,
  unregisterStackTabsRuntimeContext
} from './stackTabsContext'
import { TabEventType, useTabEmitter } from './useTabEventBus'

describe('TabEventType', () => {
  it('包含已有页面加载和页签激活事件名', () => {
    expect(TabEventType.PAGE_LOADING).toBe('PAGE_LOADING')
    expect(TabEventType.TAB_ACTIVE).toBe('TAB_ACTIVE')
  })

  it('包含 StackTabs 和 useTabRouter 已有的路由切换事件名', () => {
    expect(TabEventType.FORWARD).toBe('FORWARD')
    expect(TabEventType.BACKWARD).toBe('BACKWARD')
  })

  it('包含 iframe postMessage 刷新事件名且保持文本兼容', () => {
    expect(TabEventType.REFRESH_IFRAME_POSTMESSAGE).toBe('REFRESH_IFRAME_POSTMESSAGE')
  })
})

describe('useTabEmitter', () => {
  beforeEach(() => {
    const active = getActiveStackTabsRuntimeContext()
    if (active) unregisterStackTabsRuntimeContext(active)
  })

  it('从已注册 runtime context 返回同一个 typed emitter', () => {
    const context = createStackTabsRuntimeContext()
    const received: string[] = []

    registerStackTabsRuntimeContext(context, { isProduction: false })
    context.eventBus.on(TabEventType.TAB_ACTIVE, (payload) => received.push(payload.id))

    useTabEmitter().emit(TabEventType.TAB_ACTIVE, { id: 'tab-1' })

    expect(received).toEqual(['tab-1'])
  })

  it('未注册 runtime context 时抛出清晰错误', () => {
    expect(() => useTabEmitter()).toThrow(
      'VueStackTabs runtime context is not available. Render <VueStackTabs> before using vue-stack-tabs composables.'
    )
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm test -- src/lib/hooks/useTabEventBus.spec.ts
```

Expected: FAIL。当前 `useTabEmitter()` 仍从字符串 inject 读取，且没有 runtime context fallback。

- [ ] **Step 3: 实现 typed event bus resolver**

Replace `src/lib/hooks/useTabEventBus.ts` with:

```ts
import type { App, InjectionKey } from 'vue'
import { hasInjectionContext, inject } from 'vue'
import type { Emitter, EventType } from 'mitt'
import { resolveStackTabsRuntimeContext } from './stackTabsContext'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $layerEmitter: Emitter<TabEventPayloadMap>
  }
}

/** 标签相关事件类型 */
export enum TabEventType {
  PAGE_LOADING = 'PAGE_LOADING',
  TAB_ACTIVE = 'TAB_ACTIVE',
  FORWARD = 'FORWARD',
  BACKWARD = 'BACKWARD',
  REFRESH_IFRAME_POSTMESSAGE = 'REFRESH_IFRAME_POSTMESSAGE'
}

export interface TabEventPayloadMap extends Record<EventType, unknown> {
  [TabEventType.PAGE_LOADING]: { tId: string; value: boolean }
  [TabEventType.TAB_ACTIVE]: { id: string; isRoute?: boolean }
  [TabEventType.FORWARD]: void
  [TabEventType.BACKWARD]: void
  [TabEventType.REFRESH_IFRAME_POSTMESSAGE]: string
}

export const tabEmitterKey: InjectionKey<Emitter<TabEventPayloadMap>> = Symbol('tabEmitter')

const plugin = {
  install(_app: App): void {
    // 事件总线由唯一 <VueStackTabs> runtime context 提供。
    // 保留 no-op plugin 仅避免内部迁移期间破坏旧安装链路。
  }
}

/** 获取标签事件总线，用于组件间通信 */
export const useTabEmitter = (): Emitter<TabEventPayloadMap> => {
  const injected = hasInjectionContext() ? inject(tabEmitterKey, null) : null
  return injected ?? resolveStackTabsRuntimeContext().eventBus
}

export default plugin
```

- [ ] **Step 4: 运行 event bus 和 context 测试**

Run:

```bash
pnpm test -- src/lib/hooks/useTabEventBus.spec.ts src/lib/hooks/stackTabsContext.spec.ts
```

Expected: PASS。

- [ ] **Step 5: Checkpoint**

Do not commit unless the user explicitly asks. If commits are authorized, run:

```bash
git add src/lib/hooks/useTabEventBus.ts src/lib/hooks/useTabEventBus.spec.ts
git commit -m "refactor: resolve tab event bus from runtime context"
```

---

### Task 3: context 化 tabPanel helper

**Files:**
- Modify: `src/lib/hooks/tabPanel/evict.ts`
- Modify: `src/lib/hooks/tabPanel/scroll.ts`
- Modify: `src/lib/hooks/tabPanel/session.ts`

**Interfaces:**
- Consumes:
  - `StackTabsRuntimeContext` from `src/lib/hooks/stackTabsContext.ts`
  - `SESSION_TAB_NAME` from `src/lib/hooks/tabPanel/state.ts`
- Produces:
  - `interface TabPanelEvictionApi`
  - `function createTabPanelEviction(context: StackTabsRuntimeContext): TabPanelEvictionApi`
  - `interface TabPanelScrollApi`
  - `function createTabPanelScroll(context: StackTabsRuntimeContext): TabPanelScrollApi`
  - `interface TabPanelSessionApi`
  - `function createTabPanelSession(context: StackTabsRuntimeContext): TabPanelSessionApi`

- [ ] **Step 1: 改造 eviction helper**

Replace `src/lib/hooks/tabPanel/evict.ts` with:

```ts
/**
 * tabPanel/evict - 缓存驱逐逻辑
 *
 * 职责：基于当前 StackTabsRuntimeContext 标记待驱逐缓存、执行驱逐、维护 caches / components。
 */
import type { ITabPage } from '../../model/TabModel'
import type { StackTabsRuntimeContext } from '../stackTabsContext'

export interface TabPanelEvictionApi {
  markCacheForEviction: (cacheName: string) => void
  markTabPagesForEviction: (tab: { id: string; pages: { list(): ITabPage[] } }) => void
  markTabPagesForEvictionOnly: (tab: { pages: { list(): ITabPage[] } }) => void
  addCache: (cacheName: string) => void
  removeCache: (cacheName: string) => void
  evictPageCache: (cacheName: string) => void
  evictMarkedCaches: () => void
}

export const createTabPanelEviction = (context: StackTabsRuntimeContext): TabPanelEvictionApi => {
  const { caches, components, cacheIdsToEvict, tabIdsToEvict } = context

  const markCacheForEviction = (cacheName: string): void => {
    cacheIdsToEvict.add(cacheName)
  }

  const markTabPagesForEviction = (tab: { id: string; pages: { list(): ITabPage[] } }): void => {
    for (const page of tab.pages.list()) markCacheForEviction(page.id)
    tabIdsToEvict.add(tab.id)
  }

  const markTabPagesForEvictionOnly = (tab: { pages: { list(): ITabPage[] } }): void => {
    for (const page of tab.pages.list()) markCacheForEviction(page.id)
  }

  const addCache = (cacheName: string): void => {
    if (!caches.value.includes(cacheName)) {
      caches.value = [...caches.value, cacheName]
    }
  }

  const removeCache = (cacheName: string): void => {
    const index = caches.value.indexOf(cacheName)
    if (index >= 0) {
      caches.value = caches.value.filter((_, idx) => idx !== index)
    }
  }

  const evictPageCache = (cacheName: string): void => {
    if (!cacheName) return
    cacheIdsToEvict.delete(cacheName)
    removeCache(cacheName)
    components.delete(cacheName)
  }

  const evictMarkedCaches = (): void => {
    if (cacheIdsToEvict.size <= 0) return

    for (const cacheName of [...cacheIdsToEvict]) {
      evictPageCache(cacheName)
    }
    cacheIdsToEvict.clear()
  }

  return {
    markCacheForEviction,
    markTabPagesForEviction,
    markTabPagesForEvictionOnly,
    addCache,
    removeCache,
    evictPageCache,
    evictMarkedCaches
  }
}
```

- [ ] **Step 2: 改造 scroll helper**

Replace `src/lib/hooks/tabPanel/scroll.ts` with:

```ts
/**
 * tabPanel/scroll - 滚动位置保存与恢复
 *
 * 职责：基于当前 StackTabsRuntimeContext 在切出/切入页面时保存和恢复滚动位置。
 */
import type { StackTabsRuntimeContext } from '../stackTabsContext'

export interface TabPanelScrollApi {
  restoreScroller: (pageCacheId: string) => void
  saveScroller: (pageCacheId: string) => void
  removeScroller: (pageCacheId: string) => void
  addPageScroller: (pageCacheId: string, ...selectorIds: string[]) => void
}

export const createTabPanelScroll = (context: StackTabsRuntimeContext): TabPanelScrollApi => {
  const { scrollPositionsByPageId } = context

  const restoreScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    for (const [selector, position] of positions) {
      const element = selector.startsWith('#')
        ? document.getElementById(selector.slice(1))
        : (document.querySelector(selector) as HTMLElement | null)
      if (element) {
        element.scrollTop = position.top
        element.scrollLeft = position.left
      }
    }
  }

  const saveScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    for (const selector of positions.keys()) {
      const element = selector.startsWith('#')
        ? document.getElementById(selector.slice(1))
        : (document.querySelector(selector) as HTMLElement | null)
      positions.set(selector, {
        top: element?.scrollTop ?? 0,
        left: element?.scrollLeft ?? 0
      })
    }
  }

  const removeScroller = (pageCacheId: string): void => {
    const positions = scrollPositionsByPageId.get(pageCacheId)
    if (!positions) return

    positions.clear()
    scrollPositionsByPageId.delete(pageCacheId)
  }

  const addPageScroller = (pageCacheId: string, ...selectorIds: string[]): void => {
    if (!scrollPositionsByPageId.has(pageCacheId)) {
      scrollPositionsByPageId.set(pageCacheId, new Map())
    }
    const positions = scrollPositionsByPageId.get(pageCacheId)!
    for (const selector of selectorIds) {
      positions.set(selector, { top: 0, left: 0 })
    }
  }

  return {
    restoreScroller,
    saveScroller,
    removeScroller,
    addPageScroller
  }
}
```

- [ ] **Step 3: 改造 session helper**

Replace `src/lib/hooks/tabPanel/session.ts` with:

```ts
/**
 * tabPanel/session - Session 持久化
 *
 * 职责：基于当前 StackTabsRuntimeContext 将当前激活标签保存到 sessionStorage，刷新后恢复。
 */
import type { ITabItem, ITabPage } from '../../model/TabModel'
import { Stack } from '../../model/TabModel'
import type { StackTabsRuntimeContext } from '../stackTabsContext'
import { SESSION_TAB_NAME } from './state'

export interface TabPanelSessionApi {
  getSessionKey: () => string
  saveActiveTabToSession: (tab: ITabItem) => void
  clearSession: () => void
  restoreActiveTabSession: (storedJson: string | null) => void
  restoreTabFromSession: (storedJson: string | null) => ITabItem | null
}

export const createTabPanelSession = (context: StackTabsRuntimeContext): TabPanelSessionApi => {
  const getSessionKey = (): string => context.sessionPrefix.value + SESSION_TAB_NAME

  const saveActiveTabToSession = (tab: ITabItem): void => {
    if (!tab.id) return
    window.sessionStorage.setItem(getSessionKey(), JSON.stringify(tab))
  }

  const clearSession = (): void => {
    window.sessionStorage.removeItem(getSessionKey())
  }

  const restoreActiveTabSession = (storedJson: string | null): void => {
    if (storedJson === null) {
      clearSession()
      return
    }
    window.sessionStorage.setItem(getSessionKey(), storedJson)
  }

  const restoreTabFromSession = (storedJson: string | null): ITabItem | null => {
    if (storedJson == null) return null
    return JSON.parse(storedJson, (key, value) =>
      key === 'pages' ? new Stack<ITabPage>(value) : value
    ) as ITabItem
  }

  return {
    getSessionKey,
    saveActiveTabToSession,
    clearSession,
    restoreActiveTabSession,
    restoreTabFromSession
  }
}
```

- [ ] **Step 4: 运行类型检查确认 useTabPanel 仍待迁移**

Run:

```bash
pnpm type-check
```

Expected: FAIL。错误应集中在 `useTabPanel.tsx` 仍导入旧 helper 函数名或旧模块级状态。

- [ ] **Step 5: Checkpoint**

Do not commit unless the user explicitly asks. If commits are authorized, run:

```bash
git add src/lib/hooks/tabPanel/evict.ts src/lib/hooks/tabPanel/scroll.ts src/lib/hooks/tabPanel/session.ts
git commit -m "refactor: bind tab panel helpers to runtime context"
```

---

### Task 4: 迁移 `useTabPanel` 到 runtime context 并修复 `route.query` 不可变

**Files:**
- Modify: `src/lib/hooks/useTabPanel.tsx`
- Modify: `src/lib/hooks/useTabPanel.spec.ts`

**Interfaces:**
- Consumes:
  - `resolveStackTabsRuntimeContext(): StackTabsRuntimeContext`
  - `createTabPanelEviction(context): TabPanelEvictionApi`
  - `createTabPanelScroll(context): TabPanelScrollApi`
  - `createTabPanelSession(context): TabPanelSessionApi`
- Produces:
  - `useTabPanel()` 返回结构保持现有字段名：`tabs`、`caches`、`refreshKey`、`activeCacheKey`、`isInitialized`、`setMaxSize`、`canAddTab`、`initialize`、`size`、`active`、`getCacheName`、`destroy`、`reset`、`addCache`、`removeCache`、`getTab`、`addTab`、`removeTab`、`removeAllTabs`、`removeLeftTabs`、`removeRightTabs`、`removeOtherTabs`、`hasTab`、`renewTab`、`addPage`、`addComponent`、`getComponent`、`removeComponent`、`markCacheForEviction`、`evictMarkedCaches`、`evictPageCache`、`refreshTab`、`refreshAllTabs`、`iframeRefreshKeys`、`addPageScroller`、`setGlobalScroll`、`clearSession`、`setSessionPrefix`

- [ ] **Step 1: 在 useTabPanel 测试中加入 context 注册 helper**

In `src/lib/hooks/useTabPanel.spec.ts`, after existing `mockRoute()` add:

```ts
async function withRuntimeContext() {
  const contextModule = await import('./stackTabsContext')
  const active = contextModule.getActiveStackTabsRuntimeContext()
  if (active) contextModule.unregisterStackTabsRuntimeContext(active)

  const context = contextModule.createStackTabsRuntimeContext()
  contextModule.registerStackTabsRuntimeContext(context, { isProduction: false })

  return {
    context,
    cleanup: () => contextModule.unregisterStackTabsRuntimeContext(context)
  }
}
```

Then update every `const { default: useTabPanel } = await import('./useTabPanel')` test body to register first:

```ts
const runtime = await withRuntimeContext()
const { default: useTabPanel } = await import('./useTabPanel')
const panel = useTabPanel()

// existing assertions

panel.destroy()
runtime.cleanup()
```

For tests that currently call `panel.destroy()` before the end, keep `panel.destroy()` and add `runtime.cleanup()` immediately after it.

- [ ] **Step 2: 加入 `route.query` 不可变失败测试**

Append this test inside `describe('useTabPanel', () => { ... })`:

```ts
it('addPage 不原地修改 route.query，且 page.query 保存拷贝', async () => {
  const runtime = await withRuntimeContext()
  const { default: useTabPanel } = await import('./useTabPanel')
  const panel = useTabPanel()
  const route = mockRoute('/external')
  const originalQuery = route.query

  panel.addPage(route, {} as never)

  expect(route.query).toBe(originalQuery)
  expect(route.query.__tab).toBeUndefined()

  const createdTab = panel.tabs.value[0]
  const page = createdTab?.pages.peek()
  expect(page?.query).not.toBe(route.query)
  expect(page?.query?.__tab).toEqual(expect.any(String))

  if (page?.query) {
    page.query.extra = 'internal-only'
  }
  expect(route.query.extra).toBeUndefined()

  panel.destroy()
  runtime.cleanup()
})
```

- [ ] **Step 3: 运行 useTabPanel 测试确认失败**

Run:

```bash
pnpm test -- src/lib/hooks/useTabPanel.spec.ts
```

Expected: FAIL。当前 `useTabPanel` 仍导入旧模块级状态；并且 `parseTabInfoFromRoute()` 会写 `route.query.__tab`。

- [ ] **Step 4: 修改 `useTabPanel.tsx` 的 imports 和 context 初始化**

In `src/lib/hooks/useTabPanel.tsx`, remove this import block:

```ts
import {
  tabs,
  defaultTabs,
  caches,
  components,
  tabIdsToEvict,
  refreshKey,
  iframeRefreshKeys,
  isInitialized,
  maxTabCount,
  useGlobalScroll,
  cacheIdsToEvict,
  setMaxTabCount,
  setUseGlobalScroll,
  setSessionPrefix
} from './tabPanel/state'
import {
  markCacheForEviction,
  markTabPagesForEviction,
  markTabPagesForEvictionOnly,
  addCache,
  removeCache,
  evictMarkedCaches,
  evictPageCache
} from './tabPanel/evict'
import { restoreScroller, saveScroller, removeScroller, addPageScroller } from './tabPanel/scroll'
import {
  saveActiveTabToSession,
  clearSession,
  restoreTabFromSession,
  restoreActiveTabSession,
  getSessionKey
} from './tabPanel/session'
```

Add these imports:

```ts
import { resolveStackTabsRuntimeContext } from './stackTabsContext'
import { createTabPanelEviction } from './tabPanel/evict'
import { createTabPanelScroll } from './tabPanel/scroll'
import { createTabPanelSession } from './tabPanel/session'
```

Inside `export default () => {`, immediately after `const { t } = useI18n()` add:

```ts
  const context = resolveStackTabsRuntimeContext()
  const {
    tabs,
    defaultTabs,
    caches,
    components,
    tabIdsToEvict,
    refreshKey,
    iframeRefreshKeys,
    isInitialized,
    cacheIdsToEvict
  } = context
  const {
    markCacheForEviction,
    markTabPagesForEviction,
    markTabPagesForEvictionOnly,
    addCache,
    removeCache,
    evictMarkedCaches,
    evictPageCache
  } = createTabPanelEviction(context)
  const { restoreScroller, saveScroller, removeScroller, addPageScroller } =
    createTabPanelScroll(context)
  const {
    saveActiveTabToSession,
    clearSession,
    restoreTabFromSession,
    restoreActiveTabSession,
    getSessionKey
  } = createTabPanelSession(context)
```

- [ ] **Step 5: 更新 max/global/session setter 与 defaultTabs 写入**

In `useTabPanel.tsx`, replace:

```ts
const canAddTab = () => maxTabCount <= 0 || (maxTabCount > 0 && maxTabCount > tabs.value.length)
```

with:

```ts
const canAddTab = () =>
  context.maxTabCount.value <= 0 ||
  (context.maxTabCount.value > 0 && context.maxTabCount.value > tabs.value.length)
```

Replace:

```ts
defaultTabs.push(tab)
tabs.value.push({ ...tab })
```

with:

```ts
defaultTabs.value = [...defaultTabs.value, tab]
tabs.value = [...tabs.value, { ...tab }]
```

At the return object bottom, replace:

```ts
setMaxSize: setMaxTabCount,
```

with:

```ts
setMaxSize: (value: number) => {
  context.maxTabCount.value = value
},
```

Replace:

```ts
setGlobalScroll: setUseGlobalScroll,
```

with:

```ts
setGlobalScroll: (value: boolean) => {
  context.useGlobalScroll.value = value
},
```

Replace:

```ts
setSessionPrefix
```

with:

```ts
setSessionPrefix: (value: string) => {
  context.sessionPrefix.value = value
}
```

- [ ] **Step 6: 修复 `parseTabInfoFromRoute()` 不原地写 query**

Replace `parseTabInfoFromRoute` with:

```ts
  const parseTabInfoFromRoute = (route: RouteLocationNormalizedLoaded): ITabBase => {
    if (route.query.__tab) return decodeTabInfo(route.query.__tab as string)

    return {
      id: crypto.randomUUID(),
      title: t('VueStackTab.undefined'),
      closable: true,
      refreshable: true,
      iframe: false
    }
  }
```

- [ ] **Step 7: 增加 query 拷贝 helper 并替换三处 page.query**

Near `cloneTabPage`, add:

```ts
const cloneRouteQuery = (route: RouteLocationNormalizedLoaded, tabInfo: ITabBase) => ({
  ...route.query,
  __tab: route.query.__tab ?? encodeTabInfo(tabInfo)
})
```

Replace each occurrence of:

```ts
query: route.query as Record<string, string>
```

with:

```ts
query: cloneRouteQuery(route, tabInfo)
```

There are three target locations in `updatePageState()` when constructing a new `ITabPage`.

- [ ] **Step 8: 修复 `useGlobalScroll` ref 使用**

Replace:

```tsx
style={[useGlobalScroll ? 'overflow:auto' : 'overflow:hidden', 'height: 100%']}
```

with:

```tsx
style={[context.useGlobalScroll.value ? 'overflow:auto' : 'overflow:hidden', 'height: 100%']}
```

- [ ] **Step 9: 更新 destroy 清理 context 状态**

Replace `destroy` with:

```ts
  const destroy = () => {
    tabs.value = []
    defaultTabs.value = []
    cacheIdsToEvict.clear()
    tabIdsToEvict.clear()
    iframeRefreshKeys.value = {}
    caches.value = []
    components.clear()
    context.scrollPositionsByPageId.clear()
    context.isInitialized.value = false
    context.refreshKey.value = 0
    clearSession()
  }
```

- [ ] **Step 10: 运行 useTabPanel 测试**

Run:

```bash
pnpm test -- src/lib/hooks/useTabPanel.spec.ts
```

Expected: PASS。

- [ ] **Step 11: 运行类型检查确认下一批错误**

Run:

```bash
pnpm type-check
```

Expected: FAIL 或 PASS。如果 FAIL，错误应来自 `useTabActions.ts`、`StackTabs.vue`、`TabHeader/index.vue` 或测试 provide key 尚未迁移。

- [ ] **Step 12: Checkpoint**

Do not commit unless the user explicitly asks. If commits are authorized, run:

```bash
git add src/lib/hooks/useTabPanel.tsx src/lib/hooks/useTabPanel.spec.ts
git commit -m "refactor: migrate tab panel to runtime context"
```

---

### Task 5: 迁移 actions/router/loading 的 context 依赖与 immutable query

**Files:**
- Modify: `src/lib/hooks/useTabActions.ts`
- Modify: `src/lib/hooks/useTabActions.spec.ts`
- Modify: `src/lib/hooks/useTabRouter.ts`
- Modify: `src/lib/hooks/useTabRouter.spec.ts`
- Modify: `src/lib/hooks/useTabLoading.ts`

**Interfaces:**
- Consumes:
  - `resolveStackTabsRuntimeContext(): StackTabsRuntimeContext`
  - context 化后的 `useTabPanel()`
- Produces:
  - `useTabActions()` 返回字段名保持不变。
  - `setIFramePath(path: string): void` 改为写 `context.iframePath.value`。
  - `navigateToTab()` 不再原地写 query 对象。

- [ ] **Step 1: 在 useTabActions 测试中加入 context 注册 mock**

Because `useTabPanel` is mocked in `src/lib/hooks/useTabActions.spec.ts`, mock `resolveStackTabsRuntimeContext()` with a mutable context object.

Add after existing test variables:

```ts
const runtimeContext = {
  iframePath: { value: '/iframe' }
}
```

Add this mock before `describe('useTabActions', () => {`:

```ts
vi.mock('./stackTabsContext', () => ({
  resolveStackTabsRuntimeContext: () => runtimeContext
}))
```

In `beforeEach`, reset:

```ts
runtimeContext.iframePath.value = '/iframe'
```

- [ ] **Step 2: 增加 iframePath 来自 context 的失败测试**

Append inside `describe('useTabActions', () => { ... })`:

```ts
it('setIFramePath 写入 runtime context，iframe tab 使用 context 中的占位路由', async () => {
  const { default: useTabActions } = await import('./useTabActions')
  const { openTab, setIFramePath } = useTabActions()

  setIFramePath('/frame-host')

  await expect(
    openTab({ id: 'iframe-tab', title: 'Iframe', path: 'https://example.com/page', iframe: true })
  ).resolves.toBe('iframe-tab')

  expect(push).toHaveBeenCalledTimes(1)
  const route = push.mock.calls[0]?.[0]
  expect(route.path).toBe('/frame-host')
  expect(route.query.__src).toBe(encodeURIComponent('https://example.com/page'))
})
```

- [ ] **Step 3: 增加 immutable query 失败测试**

Append inside `describe('useTabActions', () => { ... })`:

```ts
it('openTab 不原地修改传入的 tab.query', async () => {
  const originalQuery = {
    bar: '2'
  }
  const { default: useTabActions } = await import('./useTabActions')
  const { openTab } = useTabActions()

  await expect(
    openTab({ id: 'immutable-tab', title: 'Immutable', path: '/immutable?foo=1', query: originalQuery })
  ).resolves.toBe('immutable-tab')

  expect(originalQuery).toEqual({ bar: '2' })
  const route = push.mock.calls[0]?.[0]
  expect(route.query).not.toBe(originalQuery)
  expect(route.query.foo).toBe('1')
  expect(route.query.bar).toBe('2')
  expect(route.query.__tab).toEqual(expect.any(String))
})
```

- [ ] **Step 4: 运行 useTabActions 测试确认失败**

Run:

```bash
pnpm test -- src/lib/hooks/useTabActions.spec.ts
```

Expected: FAIL。当前 `useTabActions.ts` 仍使用模块级 `iframePath` 并原地写 `query`。

- [ ] **Step 5: 修改 `useTabActions.ts` 移除模块级 iframePath**

In `src/lib/hooks/useTabActions.ts`, remove:

```ts
/** iframe 占位路由的 path，由 StackTabs 通过 setIFramePath 注入 */
let iframePath: string
```

Add import:

```ts
import { resolveStackTabsRuntimeContext } from './stackTabsContext'
```

Inside `export default function useTabActions() {`, after `const router = useRouter()` add:

```ts
  const context = resolveStackTabsRuntimeContext()
```

- [ ] **Step 6: 修改 `navigateToTab()` 为 immutable query**

Replace `navigateToTab` with:

```ts
  const navigateToTab = (tab: ITabData, tabInfo: ITabData) => {
    const __tab = encodeTabInfo(tabInfo)
    const tabQuery = omitStackTabsReservedQuery(tab.query)
    let query = defu(tabQuery, { __tab }) as LocationQueryRaw
    let path: string

    if (!tab.iframe) {
      const url = parseUrl(tab.path)
      path = url.path
      query = defu(omitStackTabsReservedQuery(url.query), query, { __tab }) as LocationQueryRaw
    } else {
      query = {
        ...query,
        __src: encodeURIComponent(tab.path as string),
        __tab
      }
      path = context.iframePath.value
    }

    if (!tab.iframe) {
      query = {
        ...query,
        __tab
      }
    }

    if (!isAllowedTabUrl(tab.path)) return Promise.reject(new Error('Invalid tab URL'))

    return runNavigationTransaction({
      apply: () => undefined,
      navigate: () => router.push({ path, query }),
      rollback: () => undefined,
      isFailureResult: isNavigationFailure,
      rejectFailureResult: true
    })
  }
```

Replace `setIFramePath` with:

```ts
  const setIFramePath = (path: string) => {
    context.iframePath.value = path
  }
```

- [ ] **Step 7: 更新 useTabRouter optimistic page query 拷贝测试**

Append inside `describe('useTabRouter', () => { ... })` in `src/lib/hooks/useTabRouter.spec.ts`:

```ts
it('forward optimistic page 保存 query 拷贝，不保留传入 to.query 引用', async () => {
  const { default: useTabRouter } = await import('./useTabRouter')
  const router = useTabRouter()
  const targetQuery = { filter: 'open' }

  router.forward({ path: '/detail-next', query: targetQuery })

  const pushedPage = currentTab.pages.peek()
  expect(pushedPage?.query).toEqual({ filter: 'open' })
  expect(pushedPage?.query).not.toBe(targetQuery)

  targetQuery.filter = 'closed'
  expect(pushedPage?.query?.filter).toBe('open')
})
```

- [ ] **Step 8: 修改 `useTabRouter.ts` 保存 optimistic query 拷贝**

In `src/lib/hooks/useTabRouter.ts`, replace inside `tab.pages.push({ ... })`:

```ts
query: targetQuery
```

with:

```ts
query: { ...targetQuery }
```

- [ ] **Step 9: 运行 actions/router/loading 相关测试**

Run:

```bash
pnpm test -- src/lib/hooks/useTabActions.spec.ts src/lib/hooks/useTabRouter.spec.ts src/lib/hooks/useTabLoading.ts
```

Expected: The first two paths should PASS. If `vitest` reports `useTabLoading.ts` is not a test file, run only:

```bash
pnpm test -- src/lib/hooks/useTabActions.spec.ts src/lib/hooks/useTabRouter.spec.ts
```

Expected: PASS。

- [ ] **Step 10: 运行全量 hook 测试**

Run:

```bash
pnpm test -- src/lib/hooks
```

Expected: PASS。

- [ ] **Step 11: Checkpoint**

Do not commit unless the user explicitly asks. If commits are authorized, run:

```bash
git add src/lib/hooks/useTabActions.ts src/lib/hooks/useTabActions.spec.ts src/lib/hooks/useTabRouter.ts src/lib/hooks/useTabRouter.spec.ts src/lib/hooks/useTabLoading.ts
git commit -m "refactor: route tab actions through runtime context"
```

---

### Task 6: 集成 StackTabs 单实例注册和 typed provide

**Files:**
- Modify: `src/lib/StackTabs.vue`
- Modify: `src/lib/components/TabHeader/index.vue`
- Modify: `src/lib/components/TabHeader/index.spec.ts`

**Interfaces:**
- Consumes:
  - `createStackTabsRuntimeContext(options): StackTabsRuntimeContext`
  - `registerStackTabsRuntimeContext(context): boolean`
  - `unregisterStackTabsRuntimeContext(context): void`
  - `stackTabsContextKey`
  - `maximumKey`
  - `tabEmitterKey`
- Produces:
  - `<VueStackTabs>` creates and provides the only runtime context.
  - `TabHeader` injects `maximumKey`.

- [ ] **Step 1: 更新 TabHeader 测试 typed provide**

In `src/lib/components/TabHeader/index.spec.ts`, add imports:

```ts
import { maximumKey } from '../../hooks/stackTabsContext'
import { tabEmitterKey } from '../../hooks/useTabEventBus'
```

Replace `global.provide`:

```ts
provide: {
  maximum: ref(false),
  tabEmitter: mitt()
},
```

with:

```ts
provide: {
  [maximumKey as symbol]: ref(false),
  [tabEmitterKey as symbol]: mitt()
},
```

- [ ] **Step 2: 运行 TabHeader 测试确认失败**

Run:

```bash
pnpm test -- src/lib/components/TabHeader/index.spec.ts
```

Expected: FAIL。当前 `TabHeader/index.vue` 仍 inject 字符串 key `maximum`。

- [ ] **Step 3: 修改 TabHeader inject**

In `src/lib/components/TabHeader/index.vue`, add import:

```ts
import { maximumKey } from '../../hooks/stackTabsContext'
```

Replace:

```ts
const maximum = inject<boolean>('maximum')
```

with:

```ts
const maximum = inject(maximumKey, ref(false))
```

This keeps template `maximum = !maximum` working because Vue template unwraps refs.

- [ ] **Step 4: 修改 StackTabs context 创建顺序**

In `src/lib/StackTabs.vue`, update imports from Vue:

```ts
import { computed, onBeforeMount, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
```

Keep `provide`.

Add imports:

```ts
import {
  createStackTabsRuntimeContext,
  maximumKey,
  registerStackTabsRuntimeContext,
  stackTabsContextKey,
  unregisterStackTabsRuntimeContext
} from './hooks/stackTabsContext'
import { tabEmitterKey } from '@/lib/hooks/useTabEventBus'
```

Move the existing `const { tabs, iframeRefreshKeys, destroy, initialize, setMaxSize, setGlobalScroll, setSessionPrefix } = useTabPanel()` block so it appears **after** `props` is defined and after runtime context is created.

After `const props = withDefaults(...)`, add:

```ts
const runtimeContext = createStackTabsRuntimeContext({
  iframePath: props.iframePath,
  maxTabCount: props.max,
  useGlobalScroll: props.globalScroll,
  sessionPrefix: props.sessionPrefix
})
const isRuntimeContextOwner = registerStackTabsRuntimeContext(runtimeContext)

if (isRuntimeContextOwner) {
  provide(stackTabsContextKey, runtimeContext)
  provide(tabEmitterKey, runtimeContext.eventBus)
}
```

Then keep `maximum` creation and replace:

```ts
provide('maximum', maximum)
```

with:

```ts
if (isRuntimeContextOwner) {
  provide(maximumKey, maximum)
}
```

Then call `useTabPanel()` and `useTabActions()` after provide:

```ts
const {
  tabs,
  iframeRefreshKeys,
  destroy,
  initialize,
  setMaxSize,
  setGlobalScroll,
  setSessionPrefix
} = useTabPanel()
const { setIFramePath, openTab } = useTabActions()
```

- [ ] **Step 5: 守卫生产重复实例不覆盖第一个 context**

In the template root of `src/lib/StackTabs.vue`, add `v-if="isRuntimeContextOwner"`:

```vue
<div
  v-if="isRuntimeContextOwner"
  class="stack-tab"
  :style="{
    width: width,
    height: height,
    'z-index': maximum ? getMaxZIndex('body *:not(.stack-tab,.stack-tab *)') : undefined
  }"
  :class="{ 'stack-tab__maximum': maximum }"
>
```

This makes production duplicate instances render nothing after warning and prevents them from presenting a second tab container.

- [ ] **Step 6: 注销 runtime context**

In `onBeforeUnmount`, after `destroy()` add:

```ts
  if (isRuntimeContextOwner) {
    unregisterStackTabsRuntimeContext(runtimeContext)
  }
```

The final block should be:

```ts
onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
  emitter.off(TabEventType.REFRESH_IFRAME_POSTMESSAGE, handleRefreshIframePostMessage)
  emitter.off(TabEventType.FORWARD, forwardHandler)
  emitter.off(TabEventType.BACKWARD, backwardHandler)
  destroy()
  if (isRuntimeContextOwner) {
    unregisterStackTabsRuntimeContext(runtimeContext)
  }
})
```

- [ ] **Step 7: 运行组件测试**

Run:

```bash
pnpm test -- src/lib/components/TabHeader/index.spec.ts src/lib/hooks/stackTabsContext.spec.ts src/lib/hooks/useTabEventBus.spec.ts
```

Expected: PASS。

- [ ] **Step 8: 运行类型检查**

Run:

```bash
pnpm type-check
```

Expected: PASS or only errors unrelated to touched files. If errors mention `provide` keys or missing context exports, fix those exact import/type mismatches before continuing.

- [ ] **Step 9: Checkpoint**

Do not commit unless the user explicitly asks. If commits are authorized, run:

```bash
git add src/lib/StackTabs.vue src/lib/components/TabHeader/index.vue src/lib/components/TabHeader/index.spec.ts
git commit -m "refactor: provide stack tabs runtime context"
```

---

### Task 7: 明确 public API 和文档契约

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `README.md`
- Modify: `docs/base/nuxt.md`
- Test: existing type-check and build scripts

**Interfaces:**
- Produces:
  - default export remains plugin object with `install(Vue: App, options?: VueStackTabsPluginOptions): void`
  - `export type VueStackTabsPluginOptions = LocaleMessageOption[]`
  - `export { StackTab, StackTab as VueStackTabs }`

- [ ] **Step 1: 修改 `src/lib/index.ts` 导出契约**

In `src/lib/index.ts`, remove:

```ts
import useTabEventBus from '@/lib/hooks/useTabEventBus'
```

Add type alias after imports:

```ts
export type VueStackTabsPluginOptions = LocaleMessageOption[]
```

Replace:

```ts
export { IFrame, useTabActions, useTabLoading, useTabRouter, TabHeaderButton, StackTab }
```

with:

```ts
export {
  IFrame,
  useTabActions,
  useTabLoading,
  useTabRouter,
  TabHeaderButton,
  StackTab,
  StackTab as VueStackTabs
}
```

Replace plugin install block:

```ts
export default {
  install(Vue: App, options?: LocaleMessageOption[]): void {
    logVersion(import.meta.env.PACKAGE_VERSION)
    Vue.component('VueStackTabs', StackTab).use(useTabEventBus).use(i18n().getI18n(options))
  }
}
```

with:

```ts
export default {
  install(Vue: App, options?: VueStackTabsPluginOptions): void {
    logVersion(import.meta.env.PACKAGE_VERSION)
    Vue.component('VueStackTabs', StackTab).use(i18n().getI18n(options))
  }
}
```

- [ ] **Step 2: 更新 README 主要用法说明**

In `README.md`, find the install/import section. Add this paragraph near the first `app.use(VueStackTabs)` example:

```md
> `vue-stack-tabs` 每个 Vue app 只支持一个 `<VueStackTabs>` 实例。默认导入 `VueStackTabs` 是 Vue plugin，用于 `app.use(VueStackTabs)`；如果需要本地组件导入，请使用 named export。
```

Add this local component import example near composable/type examples:

```ts
import { VueStackTabs as VueStackTabsComponent } from 'vue-stack-tabs'
```

Add this compatibility note:

```md
`StackTab` named export 会继续保留作为兼容别名；新代码推荐使用 `VueStackTabs` named export 表示组件。
```

- [ ] **Step 3: 更新 Nuxt 文档说明**

In `docs/base/nuxt.md`, add this note near the module setup example:

```md
Nuxt module 会通过 Vue plugin 注册全局组件 `VueStackTabs`，不是通过 Nuxt `addComponent` 直接注册。每个 Nuxt app 同样只支持一个 `<VueStackTabs>` 实例。
```

- [ ] **Step 4: 运行 API 相关检查**

Run:

```bash
pnpm type-check
pnpm run lib:build
```

Expected: PASS。`dist/index.d.ts` should include `VueStackTabsPluginOptions` and `VueStackTabs` named export after `lib:build`.

- [ ] **Step 5: 运行文档格式检查**

Run:

```bash
pnpm format:check
```

Expected: PASS or markdown formatting warnings only in modified docs. If it fails on modified docs, run:

```bash
pnpm prettier --write README.md docs/base/nuxt.md src/lib/index.ts
pnpm format:check
```

Expected: PASS。

- [ ] **Step 6: Checkpoint**

Do not commit unless the user explicitly asks. If commits are authorized, run:

```bash
git add src/lib/index.ts README.md docs/base/nuxt.md
git commit -m "docs: clarify stack tabs plugin contract"
```

---

### Task 8: 全量验证和代码审查准备

**Files:**
- No production source changes unless verification exposes failures.
- May modify touched tests/source files from earlier tasks if a verification failure points to a concrete defect.

**Interfaces:**
- Consumes all tasks above.
- Produces verified working tree ready for code review.

- [ ] **Step 1: 运行全量测试**

Run:

```bash
pnpm test
```

Expected: PASS。

- [ ] **Step 2: 运行类型检查**

Run:

```bash
pnpm type-check
```

Expected: PASS。

- [ ] **Step 3: 运行应用构建**

Run:

```bash
pnpm build
```

Expected: PASS。

- [ ] **Step 4: 运行库构建**

Run:

```bash
pnpm run lib:build
```

Expected: PASS。

- [ ] **Step 5: 运行覆盖率**

Run:

```bash
pnpm test:coverage
```

Expected: PASS. If global coverage remains below 80%, record the reported percentage and confirm all newly added/modified runtime context, event bus, query immutability, and API compatibility code is covered by tests.

- [ ] **Step 6: 检查残留模块级运行时状态导入**

Run:

```bash
grep -R "from './tabPanel/state'\|from './state'" src/lib/hooks src/lib/components src/lib/StackTabs.vue
```

Expected: only imports of `SESSION_TAB_NAME` or `createTabPanelRuntimeState` remain. No import should reference `tabs`、`caches`、`components`、`sessionPrefix`、`maxTabCount`、`useGlobalScroll`、`iframeRefreshKeys` as module-level runtime state.

- [ ] **Step 7: 检查 `route.query` 原地修改残留**

Run:

```bash
grep -R "route\.query\.[A-Za-z0-9_]*\s*=" src/lib/hooks src/lib/components src/lib/StackTabs.vue
```

Expected: no matches.

- [ ] **Step 8: 检查字符串 provide/inject 残留**

Run:

```bash
grep -R "provide('tabEmitter'\|inject('tabEmitter'\|provide('maximum'\|inject<.*>('maximum'\|inject('maximum'" src/lib
```

Expected: no matches.

- [ ] **Step 9: 启动代码审查技能**

After all verification commands pass, use the required code review flow:

```text
Invoke superpowers:requesting-code-review, then run the appropriate Vue/TypeScript code review agent on the uncommitted diff.
```

Expected: reviewer reports no CRITICAL or HIGH issues. Fix any CRITICAL/HIGH issues before reporting completion.

- [ ] **Step 10: Final checkpoint**

Do not commit unless the user explicitly asks. If commits are authorized, run:

```bash
git status --short
git add src/lib docs README.md
git commit -m "refactor: isolate stack tabs runtime context"
```

---

## Self-Review

### Spec coverage

- 单实例 runtime context：Task 1、Task 4、Task 6。
- 开发重复实例抛错、生产 warn 且不覆盖第一个 context：Task 1 tests，Task 6 integration。
- typed `InjectionKey`：Task 1 `stackTabsContextKey`/`maximumKey`，Task 2 `tabEmitterKey`，Task 6 component provide/inject。
- eventBus 去模块级单例：Task 2。
- `tabPanel/state.ts` 去模块级运行时状态：Task 1、Task 3、Task 4。
- `iframePath` 去模块级状态：Task 5。
- `route.query` 不可变：Task 4、Task 5、Task 8 grep。
- default export plugin 兼容、`StackTab` 保留、`VueStackTabs` named alias：Task 7。
- 文档更新：Task 7。
- 验证命令：Task 8。

### Placeholder scan

本计划不包含 `TBD`、`TODO`、`implement later`、`fill in details`。每个修改步骤都包含目标文件、代码块、命令和预期结果。

### Type consistency

- `StackTabsRuntimeContext` 在 Task 1 定义，并在 Task 2、3、4、6 使用相同名称。
- `createTabPanelEviction`、`createTabPanelScroll`、`createTabPanelSession` 在 Task 3 定义，并在 Task 4 使用相同名称。
- `stackTabsContextKey`、`maximumKey`、`tabEmitterKey` 在 Task 1/2 定义，并在 Task 6 使用相同名称。
- 错误消息文本与规格保持一致。
