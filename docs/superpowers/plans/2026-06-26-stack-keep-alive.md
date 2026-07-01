# StackKeepAlive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `StackTabs.vue` 中的页面缓存渲染职责抽离为内部 `StackKeepAlive` 组件，同时保持现有缓存、刷新、转场和事件行为不变。

**Architecture:** 新增 `src/lib/components/StackKeepAlive/StackKeepAlive.vue` 作为内部渲染层，内部直接调用 `useTabPanel()` 获取 `caches`、`refreshKey`、`activeCacheKey` 和 `addPage`。`StackTabs.vue` 退回组合层，只传入 `pageSwitch` 并接收 loaded 事件；不修改缓存核心算法、不对外导出新组件。

**Tech Stack:** Vue 3、TypeScript、Vite、Vitest、@vue/test-utils、happy-dom、Vue Router、vue-i18n-lite。

## Global Constraints

- `StackKeepAlive` 暂不对外导出。
- 不修改 `src/lib/index.ts`。
- 不新增公共 API 文档。
- 不拆 `StackIframeLayer`。
- 不调整缓存算法。
- 不重命名 `StackTab` / `VueStackTabs`。
- 不修改 package exports。
- 不改 Nuxt 模块集成方式。
- `keep-alive` 外层结构必须保持 `router-view -> transition -> keep-alive -> component`。
- `transition` 必须保持 `appear` 和 `mode="out-in"`。
- 动态组件 key 必须保持 `` `${activeCacheKey}-${refreshKey}` ``。
- 动态组件必须继续接收 `:vnode="Component"`。
- 子组件触发的 `on-loaded` 必须继续转发为 `StackTabs.vue` 的 `onPageLoaded`。
- 不引入新运行时依赖。
- 代码变更必须遵循 TDD：先写失败测试，再实现最小代码。
- 完成前必须运行：`pnpm test`、`pnpm type-check`、`pnpm run lib:build`。
- 不要提交或推送，除非用户明确要求；若用户要求提交，提交消息遵循 `<type>: <description>`。

---

## File Structure

本轮重构只触碰内部页面缓存渲染边界，不改变公开入口。

### 新增文件

- Create: `src/lib/components/StackKeepAlive/StackKeepAlive.vue`
  - 内部页面缓存渲染组件。
  - 负责 `router-view`、`transition`、`keep-alive`、动态组件包装、loaded 事件转发。
  - 内部直接调用 `useTabPanel()`，不通过 props 接收缓存状态。

- Create: `src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts`
  - 组件级回归测试。
  - 使用 `@vue/test-utils` 和 `happy-dom`。
  - mock `useTabPanel()` 和 `RouterView`，验证渲染层绑定关系。

### 修改文件

- Modify: `src/lib/StackTabs.vue`
  - 删除内联 `router-view + transition + keep-alive + component` 模板。
  - 引入并使用 `StackKeepAlive`。
  - 删除 `RouteLocationNormalizedLoaded`、`DefineComponent`、`VNode` 等仅为内联缓存渲染服务的类型 import。
  - 从 `useTabPanel()` 解构中移除 `caches`、`refreshKey`、`activeCacheKey`、`addPage`。
  - 保留 `onComponentLoaded()`，由 `StackKeepAlive @loaded` 触发后继续 emit `onPageLoaded`。

### 不修改文件

- Do not modify: `src/lib/index.ts`
- Do not modify: `src/lib/hooks/useTabPanel.tsx`
- Do not modify: `src/lib/hooks/tabPanel/state.ts`
- Do not modify: `src/lib/hooks/tabPanel/evict.ts`
- Do not modify: `src/lib/hooks/useTabRouter.ts`

---

### Task 1: 新增 `StackKeepAlive` 组件测试

**Files:**
- Create: `src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts`

**Interfaces:**
- Consumes:
  - Future component default export from `src/lib/components/StackKeepAlive/StackKeepAlive.vue`.
  - Mocked `useTabPanel()` shape:
    ```ts
    interface MockTabPanelApi {
      caches: Ref<string[]>
      refreshKey: Ref<number>
      activeCacheKey: Ref<string>
      addPage: Mock<(route: RouteLocationNormalizedLoaded, component: VNode) => Component>
    }
    ```
- Produces:
  - Regression coverage that later tasks must satisfy:
    - `StackKeepAlive` renders a `router-view` slot through `transition` and `keep-alive`.
    - It calls `addPage(route, Component)` with router slot data.
    - It binds dynamic component key as `` `${activeCacheKey}-${refreshKey}` ``.
    - It forwards child `onLoaded` as component event `loaded`.

- [ ] **Step 1: 写失败测试文件**

Create `src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts` with this content:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Component, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import StackKeepAlive from './StackKeepAlive.vue'

const caches = ref<string[]>([])
const refreshKey = ref(0)
const activeCacheKey = ref('')
const addPageMock = vi.fn()

vi.mock('../../hooks/useTabPanel', () => ({
  default: () => ({
    caches,
    refreshKey,
    activeCacheKey,
    addPage: addPageMock
  })
}))

interface RouterViewSlotProps {
  Component: VNode
  route: RouteLocationNormalizedLoaded
}

function makeRoute(path = '/dashboard'): RouteLocationNormalizedLoaded {
  return {
    path,
    matched: [{ path }] as RouteLocationNormalizedLoaded['matched'],
    query: {},
    params: {},
    hash: '',
    fullPath: path,
    name: undefined,
    meta: {},
    redirectedFrom: undefined
  }
}

const PageComponent = defineComponent({
  name: 'PageComponent',
  setup() {
    return () => h('section', { 'data-test': 'page-component' }, 'page')
  }
})

const WrappedPage = defineComponent({
  name: 'wrapped-cache-page',
  props: {
    vnode: {
      type: Object,
      required: false,
      default: undefined
    }
  },
  emits: ['onLoaded'],
  setup(_, { emit }) {
    return () =>
      h(
        'article',
        {
          'data-test': 'wrapped-page',
          onClick: () => emit('onLoaded')
        },
        'wrapped'
      )
  }
})

const RouterViewStub = defineComponent({
  name: 'RouterView',
  setup(_, { slots }) {
    const slotProps: RouterViewSlotProps = {
      Component: h(PageComponent),
      route: makeRoute()
    }

    return () => h('div', { 'data-test': 'router-view-stub' }, slots.default?.(slotProps))
  }
})

function mountKeepAlive(transitionName = 'stack-tab-swap') {
  return mount(StackKeepAlive, {
    props: {
      transitionName
    },
    global: {
      stubs: {
        RouterView: RouterViewStub,
        Transition: false,
        KeepAlive: false
      }
    }
  })
}

beforeEach(() => {
  caches.value = ['cache-a']
  refreshKey.value = 7
  activeCacheKey.value = 'cache-a'
  addPageMock.mockReset()
  addPageMock.mockReturnValue(WrappedPage as Component)
})

describe('StackKeepAlive', () => {
  it('通过 router-view slot 调用 addPage 并渲染包装后的缓存页面', () => {
    const wrapper = mountKeepAlive()

    expect(addPageMock).toHaveBeenCalledTimes(1)
    expect(addPageMock.mock.calls[0]?.[0]).toMatchObject({ path: '/dashboard' })
    expect(addPageMock.mock.calls[0]?.[1]).toBeTruthy()
    expect(wrapper.find('[data-test="wrapped-page"]').exists()).toBe(true)
  })

  it('使用 activeCacheKey 和 refreshKey 组成动态组件 key', async () => {
    const wrapper = mountKeepAlive()

    expect(wrapper.findComponent(WrappedPage).vm.$.vnode.key).toBe('cache-a-7')

    activeCacheKey.value = 'cache-b'
    refreshKey.value = 8
    await nextTick()

    expect(wrapper.findComponent(WrappedPage).vm.$.vnode.key).toBe('cache-b-8')
  })

  it('把缓存页 onLoaded 事件转发为 loaded', async () => {
    const wrapper = mountKeepAlive()

    await wrapper.find('[data-test="wrapped-page"]').trigger('click')

    expect(wrapper.emitted('loaded')).toHaveLength(1)
  })

  it('渲染缓存页时不改变页面转场输入', () => {
    const wrapper = mountKeepAlive('custom-transition')

    expect(wrapper.props('transitionName')).toBe('custom-transition')
    expect(wrapper.find('[data-test="wrapped-page"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run:

```bash
pnpm vitest run src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
```

Expected:

```text
FAIL  src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
```

Expected failure reason:

```text
Failed to resolve import "./StackKeepAlive.vue"
```

或等价的 module-not-found 错误，因为组件尚未创建。

- [ ] **Step 3: 不修改源码，记录失败原因**

Record this in the task notes:

```text
RED confirmed: StackKeepAlive.vue does not exist yet, so the new component test fails before implementation.
```

- [ ] **Step 4: 本任务不提交**

Do not commit unless the user explicitly requests commits. This task intentionally leaves a failing test for Task 2 to satisfy.

---

### Task 2: 实现内部 `StackKeepAlive` 渲染层

**Files:**
- Create: `src/lib/components/StackKeepAlive/StackKeepAlive.vue`
- Test: `src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts`

**Interfaces:**
- Consumes:
  - `useTabPanel()` from `src/lib/hooks/useTabPanel.tsx`.
  - `RouteLocationNormalizedLoaded` and `VNode` from router-view slot.
- Produces:
  - Internal component prop:
    ```ts
    interface StackKeepAliveProps {
      transitionName?: string
    }
    ```
  - Internal emit:
    ```ts
    const emit = defineEmits<{ loaded: [] }>()
    ```
  - Local function:
    ```ts
    const tabWrapper = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => addPage(route, component)
    ```

- [ ] **Step 1: 创建组件目录和文件**

Create `src/lib/components/StackKeepAlive/StackKeepAlive.vue` with this content:

```vue
<!--
  StackKeepAlive - 内部页面缓存渲染层

  职责：
  - 渲染 router-view 当前页面
  - 维持 transition -> keep-alive -> dynamic component 的原有结构
  - 调用 useTabPanel.addPage(route, Component) 注册栈式缓存页
  - 将缓存页 on-loaded 事件转发为 loaded

  注意：
  - 这是内部组件，暂不从 src/lib/index.ts 导出
  - 不负责 TabHeader、iframe、session 初始化或 openTab/closeTab API
-->
<script lang="ts" setup>
import type { DefineComponent, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import useTabPanel from '../../hooks/useTabPanel'

interface StackKeepAliveProps {
  transitionName?: string
}

withDefaults(defineProps<StackKeepAliveProps>(), {
  transitionName: 'stack-tab-swap'
})

const emit = defineEmits<{
  loaded: []
}>()

const { caches, refreshKey, activeCacheKey, addPage } = useTabPanel()

/** 将 router-view 的 Component 包装为带缓存 id 的页面组件，交给 addPage 注册到对应标签 */
const tabWrapper = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
  return addPage(route, component)
}

/** 页面组件加载完成时向父组件转发 */
const emitLoaded = () => {
  emit('loaded')
}
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <transition :name="transitionName" appear mode="out-in">
      <keep-alive :include="caches">
        <component
          :is="tabWrapper(route, Component)"
          :key="`${activeCacheKey}-${refreshKey}`"
          :vnode="Component"
          @on-loaded="emitLoaded"
        />
      </keep-alive>
    </transition>
  </router-view>
</template>
```

- [ ] **Step 2: 运行 `StackKeepAlive` 测试，确认通过**

Run:

```bash
pnpm vitest run src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
```

Expected:

```text
PASS  src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
```

- [ ] **Step 3: 运行相关组件测试**

Run:

```bash
pnpm vitest run src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts src/lib/hooks/useTabPanel.spec.ts
```

Expected:

```text
PASS
```

- [ ] **Step 4: 运行类型检查**

Run:

```bash
pnpm type-check
```

Expected:

```text
PASS
```

If TypeScript reports that router-view slot `Component` may be undefined, keep behavior compatible by changing only the `tabWrapper` signature to accept `VNode | undefined` and narrow before calling `addPage`:

```ts
const tabWrapper = (
  route: RouteLocationNormalizedLoaded,
  component: VNode | undefined
): DefineComponent => {
  return addPage(route, component as VNode)
}
```

Do not move fallback logic into `StackKeepAlive`; `addPage` already owns empty-component fallback behavior.

- [ ] **Step 5: 本任务不提交**

Do not commit unless the user explicitly requests commits.

---

### Task 3: 让 `StackTabs.vue` 使用 `StackKeepAlive`

**Files:**
- Modify: `src/lib/StackTabs.vue`
- Test: `src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts`

**Interfaces:**
- Consumes:
  - `StackKeepAlive` default export from `src/lib/components/StackKeepAlive/StackKeepAlive.vue`.
  - Prop `transitionName?: string`.
  - Emit `loaded: []`.
- Produces:
  - `StackTabs.vue` template uses:
    ```vue
    <StackKeepAlive :transition-name="pageSwitch" @loaded="onComponentLoaded" />
    ```
  - `StackTabs.vue` no longer owns the local `tabWrapper` function.
  - `StackTabs.vue` still emits `onPageLoaded` through `onComponentLoaded()`.

- [ ] **Step 1: 修改 `StackTabs.vue` imports**

In `src/lib/StackTabs.vue`, replace:

```ts
import { computed, onBeforeMount, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
import type { TransitionProps, DefineComponent, VNode } from 'vue'
import { type RouteLocationNormalizedLoaded } from 'vue-router'
```

with:

```ts
import { computed, onBeforeMount, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
import type { TransitionProps } from 'vue'
```

Then add this import near the existing `TabHeader` import:

```ts
import StackKeepAlive from './components/StackKeepAlive/StackKeepAlive.vue'
```

- [ ] **Step 2: 缩减 `useTabPanel()` 解构**

In `src/lib/StackTabs.vue`, replace the current `useTabPanel()` destructuring:

```ts
const {
  tabs,
  caches,
  refreshKey,
  iframeRefreshKeys,
  activeCacheKey,
  destroy,
  addPage,
  initialize,
  setMaxSize,
  setGlobalScroll,
  setSessionPrefix
} = useTabPanel()
```

with:

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
```

- [ ] **Step 3: 删除本地 `tabWrapper` 函数**

Remove this block from `src/lib/StackTabs.vue`:

```ts
/** 将 router-view 的 Component 包装为带缓存 id 的页面组件，交给 addPage 注册到对应标签 */
const tabWrapper = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
  return addPage(route, component)
}
```

Do not remove `onComponentLoaded()`.

- [ ] **Step 4: 替换模板中的内联页面缓存渲染块**

In `src/lib/StackTabs.vue`, replace this template block:

```vue
<router-view v-slot="{ Component, route }">
  <transition :name="pageSwitch" appear mode="out-in">
    <keep-alive :include="caches">
      <component
        :is="tabWrapper(route, Component)"
        :key="`${activeCacheKey}-${refreshKey}`"
        :vnode="Component"
        @on-loaded="onComponentLoaded"
      />
    </keep-alive>
  </transition>
</router-view>
```

with:

```vue
<StackKeepAlive :transition-name="pageSwitch" @loaded="onComponentLoaded" />
```

Keep the surrounding `<div class="stack-tab__container">` and iframe `transition-group` exactly where they are.

- [ ] **Step 5: 运行针对性测试**

Run:

```bash
pnpm vitest run src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts src/lib/hooks/useTabPanel.spec.ts
```

Expected:

```text
PASS
```

- [ ] **Step 6: 运行类型检查**

Run:

```bash
pnpm type-check
```

Expected:

```text
PASS
```

If TypeScript reports an unused import in `StackTabs.vue`, remove only that unused import. Do not modify `useTabPanel.tsx`.

- [ ] **Step 7: 检查 `StackTabs.vue` 行为边界未扩大**

Run:

```bash
git diff -- src/lib/StackTabs.vue src/lib/components/StackKeepAlive/StackKeepAlive.vue
```

Expected diff properties:

- `StackTabs.vue` imports `StackKeepAlive`.
- `StackTabs.vue` no longer imports `RouteLocationNormalizedLoaded`、`DefineComponent`、`VNode`。
- `StackTabs.vue` no longer destructures `caches`、`refreshKey`、`activeCacheKey`、`addPage`。
- The iframe template block remains present and structurally unchanged.
- `StackKeepAlive.vue` contains the original `router-view -> transition -> keep-alive -> component` structure.

- [ ] **Step 8: 本任务不提交**

Do not commit unless the user explicitly requests commits.

---

### Task 4: 全量验证与代码审查

**Files:**
- Read/verify: `src/lib/components/StackKeepAlive/StackKeepAlive.vue`
- Read/verify: `src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts`
- Read/verify: `src/lib/StackTabs.vue`
- Modify: none unless verification reveals failures.

**Interfaces:**
- Consumes:
  - Internal `StackKeepAlive` component from Task 2.
  - `StackTabs.vue` integration from Task 3.
- Produces:
  - Verified behavior summary with exact command status.
  - Code review findings, if any, before final response.

- [ ] **Step 1: 运行新增测试**

Run:

```bash
pnpm vitest run src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
```

Expected:

```text
PASS
```

- [ ] **Step 2: 运行全量单元测试**

Run:

```bash
pnpm test
```

Expected:

```text
PASS
```

If this fails, do not claim completion. Capture the failing test names and fix only the smallest issue related to this refactor.

- [ ] **Step 3: 运行类型检查**

Run:

```bash
pnpm type-check
```

Expected:

```text
PASS
```

If this fails, do not introduce `any`. Use existing Vue/Vue Router types, `unknown` with narrowing, or local type annotations.

- [ ] **Step 4: 运行库打包验证**

Run:

```bash
pnpm run lib:build
```

Expected:

```text
PASS
```

This verifies the internal component is compatible with library build and declaration generation.

- [ ] **Step 5: 检查没有新增公开导出**

Run:

```bash
git diff -- src/lib/index.ts package.json vite.config.lib.ts
```

Expected:

```text
(no output)
```

If output appears, revert unintended public API or package/build-config changes unless the user explicitly requested them.

- [ ] **Step 6: 检查目标 diff**

Run:

```bash
git diff -- src/lib/StackTabs.vue src/lib/components/StackKeepAlive/StackKeepAlive.vue src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts docs/superpowers/specs/2026-06-26-stack-keep-alive-design.md docs/superpowers/plans/2026-06-26-stack-keep-alive.md
```

Expected:

- Only planned files changed for this refactor.
- No `src/lib/index.ts` change.
- No `package.json` export change.
- No cache algorithm file change.
- No iframe behavior change.

- [ ] **Step 7: 请求 Vue 代码审查**

Use the required review flow after code changes:

```text
Invoke ecc:vue-review for Vue Composition API、template structure、keep-alive/transition 组合和组件边界审查。
```

Reviewer should specifically check:

- `StackKeepAlive` 没有被对外导出。
- `StackKeepAlive` 只负责页面缓存渲染。
- `StackTabs.vue` 的 iframe 层未被修改。
- `router-view -> transition -> keep-alive -> component` 结构未被改变。
- `activeCacheKey` / `refreshKey` key 组合未被改变。
- `on-loaded` 到 `loaded` 再到 `onPageLoaded` 的事件链路正确。

- [ ] **Step 8: 请求 TypeScript/通用代码审查**

Use one of these review agents:

```text
Invoke ecc:typescript-reviewer or ecc:code-reviewer for TypeScript imports、public API stability、test reliability and unnecessary abstraction review。
```

Reviewer should specifically check:

- 没有使用 `any`。
- 没有新增公共 API。
- 测试不依赖不稳定定时器。
- props/emits 类型与组件用法一致。
- 没有引入新运行时依赖。

- [ ] **Step 9: 发送最终验证摘要**

Report to the user in this format:

```markdown
完成状态：
- StackKeepAlive 内部组件：已完成 / 未完成
- StackTabs 集成：已完成 / 未完成
- 对外导出保持不变：已确认 / 未确认

验证：
- pnpm vitest run src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts: PASS/FAIL
- pnpm test: PASS/FAIL
- pnpm type-check: PASS/FAIL
- pnpm run lib:build: PASS/FAIL

变更文件：
- src/lib/components/StackKeepAlive/StackKeepAlive.vue
- src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
- src/lib/StackTabs.vue
- docs/superpowers/specs/2026-06-26-stack-keep-alive-design.md
- docs/superpowers/plans/2026-06-26-stack-keep-alive.md

注意事项：
- <如有失败、跳过项或非阻塞风险，写清楚>
```

- [ ] **Step 10: 提交最终变更**

Only run this if the user explicitly approves committing.

```bash
git add src/lib/components/StackKeepAlive/StackKeepAlive.vue src/lib/components/StackKeepAlive/StackKeepAlive.spec.ts src/lib/StackTabs.vue docs/superpowers/specs/2026-06-26-stack-keep-alive-design.md docs/superpowers/plans/2026-06-26-stack-keep-alive.md
git commit -m "refactor: extract stack keep alive renderer"
```

---

## Self-Review

### Spec coverage

- 新增内部 `StackKeepAlive` 组件：Task 2。
- 暂不对外导出、不改 `src/lib/index.ts`：Global Constraints + Task 4 Step 5。
- `StackTabs.vue` 退回组合层：Task 3。
- `StackKeepAlive` 内部直接调用 `useTabPanel()`：Task 2。
- 保持 `router-view -> transition -> keep-alive -> component` 结构：Task 2 + Task 4 review checklist。
- 保持 `appear` 和 `mode="out-in"`：Task 2。
- 保持 `` `${activeCacheKey}-${refreshKey}` `` key：Task 1 test + Task 2 implementation。
- 保持 `:vnode="Component"`：Task 2。
- 保持 `on-loaded` 到 `onPageLoaded` 事件链路：Task 1 test + Task 3 integration。
- 不改缓存核心算法、iframe、package exports、Nuxt 模块：Global Constraints + Task 4 diff checks。
- 行为保持型测试与验证：Task 1、Task 4。

### Placeholder scan

本计划不包含 `TBD`、`TODO`、`implement later` 或无代码细节的泛泛步骤。每个代码变更步骤都包含目标文件、具体代码和验证命令。

### Type consistency

- `StackKeepAliveProps.transitionName` 在 Task 2 定义，并在 Task 3 以 kebab-case `transition-name` 使用。
- `loaded` emit 在 Task 2 定义，并在 Task 3 以 `@loaded="onComponentLoaded"` 使用。
- `tabWrapper(route, component)` 签名与现有 `useTabPanel.addPage(route, component)` 调用保持一致。
- 测试 mock 的 `caches`、`refreshKey`、`activeCacheKey` 与真实 `useTabPanel()` 返回值名称一致。
- 计划没有引入新公共导出、包导出或运行时依赖。
