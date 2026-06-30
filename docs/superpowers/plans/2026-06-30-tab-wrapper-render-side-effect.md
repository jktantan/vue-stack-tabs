# TabWrapper Render Side Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the `addPage(route, Component)` side effect out of the `StackKeepAlive.vue` render expression while preserving existing tab/page/cache behavior.

**Architecture:** Add a small internal renderless component, `StackCacheRenderer.vue`, that watches route/component identity and exposes the resolved wrapper component through a scoped slot. `StackKeepAlive.vue` keeps ownership of `<router-view>`, `<transition>`, and `<keep-alive>`, so the actual cache page component remains the direct child of `<keep-alive>`.

**Tech Stack:** Vue 3 SFC, Composition API, TypeScript, Vue Router slot props, Vitest, Vue Test Utils, happy-dom.

## Global Constraints

- Minimal-risk fix only: do not refactor `useTabPanel` state machine or tab routing behavior.
- Do not change naked-route behavior where missing `__tab` can create an `undefined` / random tab.
- Do not change `updatePageState` path-only page matching.
- Preserve `addPage`, `updatePageState`, `resolvePageComponent`, refresh, forward, backward, evict, and session restore behavior.
- Preserve `lastRouteKey` as the second-layer duplicate guard inside `addPage`.
- Keep the actual `<component :is="wrappedComponent">` as the direct child of `<keep-alive>`; otherwise `keep-alive :include="caches"` may match the renderer component instead of the cache page component name.
- Do not commit or push unless the user explicitly asks for git operations.

---

## File Structure

- Create: `src/lib/components/StackKeepAlive/StackCacheRenderer.vue`
  - Internal renderless component.
  - Receives `route` and `component` from `<router-view>`.
  - Calls `addPage(route, component)` only when route fullPath, `__tab`, or component identity changes.
  - Exposes `wrappedComponent`, `activeCacheKey`, `refreshKey`, and `component` through the default scoped slot.

- Modify: `src/lib/components/StackKeepAlive/StackKeepAlive.vue`
  - Remove render-time `tabWrapper(route, Component)`.
  - Import and use `StackCacheRenderer`.
  - Keep `<transition> -> <keep-alive> -> <component :is="wrappedComponent">` structure inside the renderer scoped slot.
  - Keep only `caches` from `useTabPanel()` in this component.

- Modify: `src/lib/hooks/useTabPanel.tsx`
  - Type-only safety adjustment: allow `addPage` to receive `undefined` / `null` component because the function already handles falsy `component` at runtime.
  - Do not change `addPage` logic.

- Create: `test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts`
  - Focused tests for the new renderer watcher behavior.
  - Verifies route changes and component identity changes trigger `addPage`.
  - Verifies key-only reactive changes do not trigger `addPage`.

- Modify: `test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts`
  - Integration tests for the updated `StackKeepAlive.vue` template.
  - Verifies `activeCacheKey` / `refreshKey` still remount the cache page but do not call `addPage` again.

---

### Task 1: Add StackCacheRenderer with focused tests

**Files:**
- Create: `test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts`
- Create: `src/lib/components/StackKeepAlive/StackCacheRenderer.vue`
- Modify: `src/lib/hooks/useTabPanel.tsx:550`

**Interfaces:**
- Consumes:
  - `useTabPanel().addPage(route, component)` from `src/lib/hooks/useTabPanel.tsx`
  - `useTabPanel().activeCacheKey`
  - `useTabPanel().refreshKey`
- Produces:
  - `StackCacheRenderer.vue` props:
    - `route: RouteLocationNormalizedLoaded`
    - `component?: VNode | null`
  - `StackCacheRenderer.vue` default slot props:
    - `wrappedComponent: DefineComponent`
    - `activeCacheKey: string`
    - `refreshKey: number`
    - `component?: VNode | null`

- [ ] **Step 1: Write the failing renderer tests**

Create `test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts` with this content:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Component, DefineComponent, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import StackCacheRenderer from '@/lib/components/StackKeepAlive/StackCacheRenderer.vue'

const refreshKey = ref(0)
const activeCacheKey = ref('cache-a')
const addPageMock = vi.fn()

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    refreshKey,
    activeCacheKey,
    addPage: addPageMock
  })
}))

interface RendererSlotProps {
  wrappedComponent: DefineComponent
  activeCacheKey: string
  refreshKey: number
  component?: VNode | null
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

const AlternatePageComponent = defineComponent({
  name: 'AlternatePageComponent',
  setup() {
    return () => h('section', { 'data-test': 'alternate-page-component' }, 'alternate')
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
  setup(props) {
    return () =>
      h(
        'article',
        {
          'data-test': 'wrapped-page',
          'data-has-vnode': props.vnode ? 'true' : 'false'
        },
        'wrapped'
      )
  }
})

function makeComponent(component: Component = PageComponent): VNode {
  return h(component)
}

function mountRenderer(props?: {
  route?: RouteLocationNormalizedLoaded
  component?: VNode | null
}) {
  return mount(StackCacheRenderer, {
    props: {
      route: props?.route ?? makeRoute(),
      component: props?.component ?? makeComponent()
    },
    slots: {
      default: ({ wrappedComponent, activeCacheKey, refreshKey, component }: RendererSlotProps) =>
        h(wrappedComponent, {
          vnode: component,
          key: `${activeCacheKey}-${refreshKey}`
        })
    }
  })
}

beforeEach(() => {
  refreshKey.value = 0
  activeCacheKey.value = 'cache-a'
  addPageMock.mockReset()
  addPageMock.mockReturnValue(WrappedPage)
})

describe('StackCacheRenderer', () => {
  it('首次渲染时调用 addPage 并通过插槽渲染包装组件', async () => {
    const wrapper = mountRenderer()
    await nextTick()

    expect(addPageMock).toHaveBeenCalledTimes(1)
    expect(addPageMock.mock.calls[0]?.[0]).toMatchObject({ path: '/dashboard' })
    expect(addPageMock.mock.calls[0]?.[1]).toBeTruthy()
    expect(wrapper.find('[data-test="wrapped-page"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="wrapped-page"]').attributes('data-has-vnode')).toBe('true')
  })

  it('activeCacheKey 和 refreshKey 变化时不重复调用 addPage', async () => {
    mountRenderer()
    await nextTick()

    activeCacheKey.value = 'cache-b'
    refreshKey.value = 1
    await nextTick()

    expect(addPageMock).toHaveBeenCalledTimes(1)
  })

  it('route fullPath 变化时重新调用 addPage', async () => {
    const wrapper = mountRenderer()
    await nextTick()

    await wrapper.setProps({ route: makeRoute('/reports') })

    expect(addPageMock).toHaveBeenCalledTimes(2)
    expect(addPageMock.mock.calls[1]?.[0]).toMatchObject({ path: '/reports' })
  })

  it('同组件类型的新 VNode 不重复调用 addPage', async () => {
    const wrapper = mountRenderer()
    await nextTick()

    await wrapper.setProps({ component: makeComponent(PageComponent) })

    expect(addPageMock).toHaveBeenCalledTimes(1)
  })

  it('组件类型变化时重新调用 addPage', async () => {
    const wrapper = mountRenderer()
    await nextTick()

    const nextComponent = makeComponent(AlternatePageComponent)
    await wrapper.setProps({ component: nextComponent })

    expect(addPageMock).toHaveBeenCalledTimes(2)
    expect(addPageMock.mock.calls[1]?.[1]).toBe(nextComponent)
  })
})
```

- [ ] **Step 2: Run the focused renderer test to verify it fails**

Run:

```bash
pnpm vitest run test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts
```

Expected result:

```text
FAIL  test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts
Error: Failed to resolve import "@/lib/components/StackKeepAlive/StackCacheRenderer.vue"
```

The exact wording may differ by Vite/Vitest version, but the failure must be because `StackCacheRenderer.vue` does not exist yet.

- [ ] **Step 3: Adjust `addPage` parameter type without changing logic**

In `src/lib/hooks/useTabPanel.tsx`, change only the `addPage` function parameter type.

Replace:

```ts
const addPage = (route: RouteLocationNormalizedLoaded, component: VNode): DefineComponent => {
  if (!component) return EmptyPlaceholderComponent as DefineComponent
```

With:

```ts
const addPage = (
  route: RouteLocationNormalizedLoaded,
  component?: VNode | null
): DefineComponent => {
  if (!component) return EmptyPlaceholderComponent as DefineComponent
```

Do not change the body of `addPage`.

- [ ] **Step 4: Implement `StackCacheRenderer.vue`**

Create `src/lib/components/StackKeepAlive/StackCacheRenderer.vue` with this content:

```vue
<!--
  StackCacheRenderer - 内部缓存组件解析层

  职责：
  - 接收 router-view slot 提供的 route 与 Component
  - 仅在 route/component 身份变化时调用 useTabPanel.addPage
  - 通过 scoped slot 暴露包装组件，确保真正的缓存页仍是 keep-alive 的直接子节点

  注意：
  - 这是内部组件，暂不从 src/lib/index.ts 导出
  - 不负责 transition、keep-alive、TabHeader、iframe 或 session 初始化
-->
<script lang="ts" setup>
import { defineComponent, shallowRef, watch } from 'vue'
import type { DefineComponent, VNode } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import useTabPanel from '../../hooks/useTabPanel'

interface StackCacheRendererProps {
  route: RouteLocationNormalizedLoaded
  component?: VNode | null
}

interface StackCacheRendererSlotProps {
  wrappedComponent: DefineComponent
  activeCacheKey: string
  refreshKey: number
  component?: VNode | null
}

const props = defineProps<StackCacheRendererProps>()

defineSlots<{
  default(props: StackCacheRendererSlotProps): unknown
}>()

const { refreshKey, activeCacheKey, addPage } = useTabPanel()

const EmptyRendererComponent = defineComponent({
  name: 'StackCacheRendererEmpty',
  setup() {
    return () => null
  }
})

const wrappedComponent = shallowRef<DefineComponent>(EmptyRendererComponent)

const getComponentIdentity = (component?: VNode | null): unknown => {
  return component?.type ?? component
}

watch(
  () => [props.route.fullPath, props.route.query.__tab, getComponentIdentity(props.component)] as const,
  () => {
    wrappedComponent.value = addPage(props.route, props.component)
  },
  { immediate: true }
)
</script>

<template>
  <slot
    :wrapped-component="wrappedComponent"
    :active-cache-key="activeCacheKey"
    :refresh-key="refreshKey"
    :component="component"
  />
</template>
```

- [ ] **Step 5: Run the focused renderer test to verify it passes**

Run:

```bash
pnpm vitest run test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts
```

Expected result:

```text
Test Files  1 passed
Tests  5 passed
```

- [ ] **Step 6: Run type checking for the new component and type adjustment**

Run:

```bash
pnpm type-check
```

Expected result:

```text
No type errors.
```

If `vue-tsc` prints build metadata but exits with code `0`, treat that as passing.

---

### Task 2: Integrate StackCacheRenderer into StackKeepAlive

**Files:**
- Modify: `src/lib/components/StackKeepAlive/StackKeepAlive.vue`
- Modify: `test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts`

**Interfaces:**
- Consumes:
  - `StackCacheRenderer.vue` props from Task 1:
    - `route: RouteLocationNormalizedLoaded`
    - `component?: VNode | null`
  - `StackCacheRenderer.vue` slot props from Task 1:
    - `wrappedComponent: DefineComponent`
    - `activeCacheKey: string`
    - `refreshKey: number`
    - `component?: VNode | null`
- Produces:
  - `StackKeepAlive.vue` no longer has `tabWrapper(route, Component)`.
  - `StackKeepAlive.vue` still emits `loaded` when the wrapped cache page emits `onLoaded`.
  - `StackKeepAlive.vue` still renders the wrapped cache page inside `<transition><keep-alive>...</keep-alive></transition>`.

- [ ] **Step 1: Update the integration test to prove key-only changes do not call `addPage` again**

In `test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts`, replace this test:

```ts
it('activeCacheKey 和 refreshKey 变化时重建缓存页实例', async () => {
  const wrapper = mountKeepAlive()

  const firstInstanceId = wrapper
    .find('[data-test="wrapped-page"]')
    .attributes('data-instance-id')

  activeCacheKey.value = 'cache-b'
  refreshKey.value = 8
  await nextTick()

  const secondInstanceId = wrapper
    .find('[data-test="wrapped-page"]')
    .attributes('data-instance-id')

  expect(secondInstanceId).not.toBe(firstInstanceId)
})
```

With this test:

```ts
it('activeCacheKey 和 refreshKey 变化时重建缓存页实例但不重复调用 addPage', async () => {
  const wrapper = mountKeepAlive()
  await nextTick()

  expect(addPageMock).toHaveBeenCalledTimes(1)

  const firstInstanceId = wrapper
    .find('[data-test="wrapped-page"]')
    .attributes('data-instance-id')

  activeCacheKey.value = 'cache-b'
  refreshKey.value = 8
  await nextTick()

  const secondInstanceId = wrapper
    .find('[data-test="wrapped-page"]')
    .attributes('data-instance-id')

  expect(secondInstanceId).not.toBe(firstInstanceId)
  expect(addPageMock).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run the StackKeepAlive test to verify it fails before integration**

Run:

```bash
pnpm vitest run test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
```

Expected result before changing `StackKeepAlive.vue`:

```text
FAIL  test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
AssertionError: expected "spy" to be called 1 times, but got 2 times
```

The exact spy count may be higher than `2`; the important failure is that key-only reactive changes still cause extra `addPage` calls.

- [ ] **Step 3: Replace render-time `tabWrapper` in `StackKeepAlive.vue`**

Replace the current `src/lib/components/StackKeepAlive/StackKeepAlive.vue` content with:

```vue
<!--
  StackKeepAlive - 内部页面缓存渲染层

  职责：
  - 渲染 router-view 当前页面
  - 维持 transition -> keep-alive -> dynamic component 的原有结构
  - 通过 StackCacheRenderer 注册并解析栈式缓存页
  - 将缓存页 on-loaded 事件转发为 loaded

  注意：
  - 这是内部组件，暂不从 src/lib/index.ts 导出
  - 不负责 TabHeader、iframe、session 初始化或 openTab/closeTab API
-->
<script lang="ts" setup>
import useTabPanel from '../../hooks/useTabPanel'
import StackCacheRenderer from './StackCacheRenderer.vue'

interface StackKeepAliveProps {
  transitionName?: string
}

withDefaults(defineProps<StackKeepAliveProps>(), {
  transitionName: 'stack-tab-swap'
})

const emit = defineEmits<{
  loaded: []
}>()

const { caches } = useTabPanel()

/** 页面组件加载完成时向父组件转发 */
const emitLoaded = () => {
  emit('loaded')
}
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <StackCacheRenderer
      v-slot="{ wrappedComponent, activeCacheKey, refreshKey, component }"
      :route="route"
      :component="Component"
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
</template>
```

- [ ] **Step 4: Run the StackKeepAlive test to verify integration passes**

Run:

```bash
pnpm vitest run test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
```

Expected result:

```text
Test Files  1 passed
Tests  4 passed
```

- [ ] **Step 5: Run both focused StackKeepAlive component tests**

Run:

```bash
pnpm vitest run test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
```

Expected result:

```text
Test Files  2 passed
Tests  9 passed
```

---

### Task 3: Run regression checks for the minimal-risk change

**Files:**
- No new files.
- Verify all files changed by Tasks 1 and 2.

**Interfaces:**
- Consumes:
  - `StackCacheRenderer.vue` from Task 1.
  - Updated `StackKeepAlive.vue` from Task 2.
- Produces:
  - Verification evidence that the render-time side effect fix does not break the existing test suite or type checking.

- [ ] **Step 1: Run the full Vitest suite**

Run:

```bash
pnpm test
```

Expected result:

```text
Test Files  all passed
Tests  all passed
```

- [ ] **Step 2: Run TypeScript/Vue type checking**

Run:

```bash
pnpm type-check
```

Expected result:

```text
No type errors.
```

If `vue-tsc` prints build progress or cache information and exits with code `0`, treat that as passing.

- [ ] **Step 3: Run lint check without auto-fixing**

Run:

```bash
pnpm lint:check
```

Expected result:

```text
No ESLint errors.
```

- [ ] **Step 4: Inspect the working tree**

Run:

```bash
git status --short
```

Expected changed files:

```text
M  src/lib/components/StackKeepAlive/StackKeepAlive.vue
A  src/lib/components/StackKeepAlive/StackCacheRenderer.vue
M  src/lib/hooks/useTabPanel.tsx
A  test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts
M  test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts
?? docs/superpowers/specs/2026-06-30-tab-wrapper-render-side-effect-design.md
?? docs/superpowers/plans/2026-06-30-tab-wrapper-render-side-effect.md
```

Other pre-existing untracked files may appear. Do not delete or overwrite unrelated files.

- [ ] **Step 5: Do not commit unless explicitly requested**

Because the harness instruction says to commit only when the user asks, stop after reporting verification results. If the user explicitly asks for a commit later, use a conventional message such as:

```bash
git add src/lib/components/StackKeepAlive/StackKeepAlive.vue \
  src/lib/components/StackKeepAlive/StackCacheRenderer.vue \
  src/lib/hooks/useTabPanel.tsx \
  test/lib/components/StackKeepAlive/StackCacheRenderer.spec.ts \
  test/lib/components/StackKeepAlive/StackKeepAlive.spec.ts \
  docs/superpowers/specs/2026-06-30-tab-wrapper-render-side-effect-design.md \
  docs/superpowers/plans/2026-06-30-tab-wrapper-render-side-effect.md

git commit -m "fix: remove tab wrapper render side effect"
```

---

## Self-Review

### Spec coverage

- Remove `tabWrapper(route, Component)` from render expression: covered by Task 2.
- Preserve existing `useTabPanel` core logic: covered by Task 1 type-only `addPage` signature adjustment and Task 2 integration.
- Call `addPage` only on route/component changes: covered by Task 1 renderer watcher tests.
- Keep `keep-alive` direct child semantics: covered by scoped-slot architecture in Task 2.
- Verify `activeCacheKey` / `refreshKey` remount without duplicate `addPage`: covered by Task 2 test update.

### Placeholder scan

No `TBD`, `TODO`, “implement later”, or unresolved placeholders are present.

### Type consistency

- `StackCacheRendererProps.component` is `VNode | null | undefined`.
- `addPage` accepts `VNode | null | undefined` and still returns `DefineComponent`.
- `StackCacheRenderer` slot prop names match the consuming `StackKeepAlive.vue` template: `wrappedComponent`, `activeCacheKey`, `refreshKey`, `component`.
