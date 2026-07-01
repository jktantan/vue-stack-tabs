# Lib Bugfix Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以完全兼容方式修复 `src/lib` 中 `contextmenu`、`TabScrollMode` 和事件名类型不一致的问题，并用回归测试锁定行为。

**Architecture:** 本计划采用小步 TDD：每个行为先写失败测试，再做最小源码修复。保持公共 API、导出名、props 名、默认值、构建产物路径不变；不拆 `useTabPanel.tsx`，不迁移全局单例状态。

**Tech Stack:** Vue 3、TypeScript、Vite、Vitest、@vue/test-utils、happy-dom、mitt、vue-i18n-lite。

## Global Constraints

- 完全兼容：不改公开导出名、props 名、默认值和 README 中已有用法。
- 库入口保持 `src/lib/index.ts`。
- 不拆 `src/lib/hooks/useTabPanel.tsx`。
- 不把全局单例状态改成实例级状态。
- 不调整包产物路径或构建配置。
- 不重命名组件、hook、事件、类型。
- 不重写 iframe 通信架构。
- 不引入新运行时依赖。
- 代码变更必须遵循 TDD：先写失败测试，再实现最小修复。
- 完成前必须运行：`pnpm test`、`pnpm type-check`、`pnpm build`、`pnpm test:coverage`。
- 若基础覆盖率低于 80%，必须记录当前覆盖率、缺口原因，以及本轮新增/修改代码对应测试是否已覆盖。
- 不要提交或推送，除非用户明确要求；若用户要求提交，提交消息遵循 `<type>: <description>`。

---

## File Structure

本轮计划只触碰与稳定修 Bug 直接相关的文件。

### 测试文件

- Create: `src/lib/components/TabHeader/index.spec.ts`
  - 负责 `contextmenu` 的默认启用、显式禁用、自定义菜单传递测试。
  - 使用 `happy-dom`，通过 stub 隔离 `TabHeaderScroll`、`TabHeaderItem`、`ContextMenu`。
- Create: `src/lib/components/TabHeader/TabHeaderScroll.spec.ts`
  - 负责 `isScrollWheel`、`isScrollButton` 三种组合行为测试。
  - mock `scrollUtils.scrollTo()`，避免依赖浏览器真实滚动实现。
- Create: `src/lib/hooks/useTabEventBus.spec.ts`
  - 负责事件名常量完整性测试，锁定 `FORWARD`、`BACKWARD`、`REFRESH_IFRAME_POSTMESSAGE` 文本不变。

### 源码文件

- Modify: `src/lib/components/TabHeader/index.vue`
  - 归一化 `contextmenu`。
  - 禁用时不打开自定义右键菜单。
  - 将自定义菜单数组传给 `ContextMenu`。
  - 修复 `isScrollWheel` 为 `computed`，避免后续 prop 更新时不响应。
- Modify: `src/lib/components/TabHeader/TabHeaderScroll.vue`
  - `wheel` handler 尊重 `props.isScrollWheel`。
  - 左右按钮显示尊重 `props.isScrollButton` 且仅在内容溢出时显示。
- Modify: `src/lib/hooks/useTabEventBus.ts`
  - 把实际事件名加入 `TabEventType`。
  - 导出 typed event payload map，减少局部裸字符串和类型断言。
- Modify: `src/lib/hooks/useTabRouter.ts`
  - 使用 `TabEventType.FORWARD`、`TabEventType.BACKWARD`，不改变事件文本和 payload。
- Modify: `src/lib/StackTabs.vue`
  - 把 `contextmenu`、`tabScrollMode` 传给 `TabHeader`。
  - 使用统一事件名常量替换裸字符串。
  - 不改变 iframe 刷新 postMessage 内容、openTab 协议和生命周期。

---

### Task 1: 修复 `contextmenu` 配置链路

**Files:**
- Create: `src/lib/components/TabHeader/index.spec.ts`
- Modify: `src/lib/components/TabHeader/index.vue`
- Modify: `src/lib/StackTabs.vue`

**Interfaces:**
- Consumes:
  - `ITabItem` from `src/lib/model/TabModel.ts`
  - `IContextMenu` from `src/lib/model/TabModel.ts`
  - `useContextMenu()` from `src/lib/hooks/useContextMenu.ts`
- Produces:
  - `TabHeader` 内部 computed：`isContextMenuEnabled: ComputedRef<boolean>`
  - `TabHeader` 内部 computed：`normalizedContextMenu: ComputedRef<IContextMenu[]>`
  - `TabHeader` 内部 handler：`handleTabContextMenu(e: MouseEvent, item: ITabItem, index: number, max: number): void`

- [ ] **Step 1: 写 `contextmenu` 失败测试**

Create `src/lib/components/TabHeader/index.spec.ts` with this content:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import mitt from 'mitt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Component } from 'vue'
import type { IContextMenu, ITabItem } from '../../model/TabModel'
import TabHeader from './index.vue'

const activeTabMock = vi.fn()
const closeTabMock = vi.fn()
const tabs = ref<ITabItem[]>([])

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('../../hooks/useTabActions', () => ({
  default: () => ({
    activeTab: activeTabMock,
    closeTab: closeTabMock,
    tabs
  })
}))

const TabHeaderScrollStub = defineComponent({
  name: 'TabHeaderScroll',
  props: {
    space: Number,
    isScrollWheel: Boolean,
    isScrollButton: Boolean
  },
  setup(_, { slots, expose }) {
    expose({
      isInView: () => true,
      scrollIntoView: vi.fn()
    })

    return () => h('div', { class: 'tab-header-scroll-stub' }, slots.default?.())
  }
})

const TabHeaderItemStub = defineComponent({
  name: 'TabHeaderItem',
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  emits: ['contextmenu', 'active', 'close'],
  setup(props, { emit }) {
    return () =>
      h(
        'li',
        {
          class: 'stack-tab__item',
          onClick: () => emit('active', props.item, undefined, true),
          onContextmenu: (event: MouseEvent) => emit('contextmenu', event)
        },
        String((props.item as ITabItem).title)
      )
  }
})

const ContextMenuStub = defineComponent({
  name: 'ContextMenu',
  props: {
    left: Number,
    top: Number,
    tabItem: Object,
    max: Number,
    index: Number,
    contextMenu: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close'],
  setup(props) {
    return () =>
      h('div', { class: 'stack-tab__contextmenu', 'data-test': 'context-menu' }, [
        h('span', { 'data-test': 'custom-menu-count' }, String((props.contextMenu as unknown[]).length)),
        ...(props.contextMenu as IContextMenu[]).map((item) =>
          h(
            'button',
            {
              type: 'button',
              'data-test': `custom-menu-${item.title}`,
              onClick: () => item.callback((props.tabItem as ITabItem).id)
            },
            item.title
          )
        )
      ])
  }
})

function makeTab(overrides: Partial<ITabItem> = {}): ITabItem {
  return {
    id: 'tab-1',
    title: 'Dashboard',
    closable: true,
    refreshable: true,
    iframe: false,
    active: true,
    pages: { list: () => [] } as ITabItem['pages'],
    ...overrides
  }
}

function mountHeader(props: Record<string, unknown> = {}) {
  return mount(TabHeader, {
    props: {
      space: 300,
      ...props
    },
    global: {
      provide: {
        maximum: ref(false),
        tabEmitter: mitt()
      },
      stubs: {
        TabHeaderScroll: TabHeaderScrollStub as Component,
        TabHeaderItem: TabHeaderItemStub as Component,
        ContextMenu: ContextMenuStub as Component,
        TabHeaderButton: true,
        Transition: false,
        TransitionGroup: false
      }
    }
  })
}

async function triggerTabContextMenu(wrapper: ReturnType<typeof mountHeader>) {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 120,
    clientY: 80
  })

  wrapper.find('.stack-tab__item').element.dispatchEvent(event)
  await nextTick()
  await nextTick()

  return event
}

beforeEach(() => {
  activeTabMock.mockClear()
  closeTabMock.mockClear()
  tabs.value = [makeTab()]
})

describe('TabHeader contextmenu', () => {
  it('默认启用右键菜单', async () => {
    const wrapper = mountHeader()

    const event = await triggerTabContextMenu(wrapper)

    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.find('[data-test="context-menu"]').exists()).toBe(true)
  })

  it('contextmenu=false 时不打开自定义右键菜单，且左键激活仍工作', async () => {
    const wrapper = mountHeader({ contextmenu: false })

    const event = await triggerTabContextMenu(wrapper)

    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.find('[data-test="context-menu"]').exists()).toBe(false)

    await wrapper.find('.stack-tab__item').trigger('click')

    expect(activeTabMock).toHaveBeenCalledWith('tab-1', true)
  })

  it('传入 IContextMenu[] 时把自定义菜单透传给 ContextMenu', async () => {
    const customMenuCallback = vi.fn()
    const contextmenu: IContextMenu[] = [
      {
        title: 'Pin tab',
        callback: customMenuCallback,
        disabled: () => false
      }
    ]
    const wrapper = mountHeader({ contextmenu })

    await triggerTabContextMenu(wrapper)
    await wrapper.find('[data-test="custom-menu-Pin tab"]').trigger('click')

    expect(wrapper.find('[data-test="custom-menu-count"]').text()).toBe('1')
    expect(customMenuCallback).toHaveBeenCalledWith('tab-1')
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run:

```bash
pnpm vitest run src/lib/components/TabHeader/index.spec.ts
```

Expected:

```text
FAIL  src/lib/components/TabHeader/index.spec.ts
```

至少应出现以下失败之一：

- `contextmenu=false` 时仍打开菜单。
- 自定义菜单没有传递到 `ContextMenu`，`custom-menu-count` 为 `0`。
- `StackTabs` 未把 `contextmenu` 传给 `TabHeader`，集成后不会生效。

- [ ] **Step 3: 修改 `src/lib/components/TabHeader/index.vue` 的 template**

Replace the `<tab-header-item ... />` block and `<context-menu ... />` block in `src/lib/components/TabHeader/index.vue` with this version:

```vue
<tab-header-item
  v-for="(item, index) in tabs"
  :key="item.id"
  :item="item as ITabItem"
  @contextmenu="
    (e: MouseEvent) => handleTabContextMenu(e, item as unknown as ITabItem, index, tabs.length)
  "
  @click.middle.prevent="handleCloseTab(item as ITabItem)"
  @close="handleCloseTab"
  @active="handleActivateTab"
/>
```

And:

```vue
<context-menu
  v-if="contextMenuShown"
  key="context-menu-transition"
  :left="contextMenuData.left"
  :top="contextMenuData.top"
  :tab-item="contextMenuData.item as ITabItem"
  :max="contextMenuData.max"
  :index="contextMenuData.index"
  :context-menu="normalizedContextMenu"
  @close="handleCloseContextMenu"
/>
```

- [ ] **Step 4: 修改 `src/lib/components/TabHeader/index.vue` 的 script**

Update imports:

```ts
import { inject, computed, ref, nextTick } from 'vue'
import type { TransitionProps } from 'vue'
import { TabScrollMode } from '../../model/TabModel'
import type { IContextMenu, ITabItem } from '../../model/TabModel'
```

Then insert these computed values and handler after `const { closeTab, activeTab, tabs } = useTabActions()`:

```ts
/** 右键菜单是否启用；仅 false 明确禁用，其余旧对象值保持启用以兼容历史写法 */
const isContextMenuEnabled = computed<boolean>(() => props.contextmenu !== false)

/** 自定义菜单数组；非数组对象按历史宽类型兼容为默认菜单，不抛错 */
const normalizedContextMenu = computed<IContextMenu[]>(() => {
  return Array.isArray(props.contextmenu) ? props.contextmenu : []
})

/** 右键标签：禁用时不阻止浏览器默认菜单，启用时打开组件菜单 */
const handleTabContextMenu = (e: MouseEvent, item: ITabItem, index: number, max: number) => {
  if (!isContextMenuEnabled.value) return

  e.preventDefault()
  showContextMenu(e, item, index, max)
}
```

Replace the existing `isScrollWheel` constant with a computed value:

```ts
/** 是否支持滚轮滚动 */
const isScrollWheel = computed<boolean>(() => {
  return props.tabScrollMode === TabScrollMode.BOTH || props.tabScrollMode === TabScrollMode.WHEEL
})
```

Do not rename the public prop `contextmenu`.

- [ ] **Step 5: 修改 `src/lib/StackTabs.vue`，把 props 传给 `TabHeader`**

Replace the `<tab-header ...>` opening tag in `src/lib/StackTabs.vue` with:

```vue
<tab-header
  :space="space"
  :tab-transition="tabTransition"
  :tab-scroll-mode="tabScrollMode"
  :contextmenu="contextmenu"
  :max="max"
  @active="onTabActive"
>
```

This is required because `StackTabs` currently declares `contextmenu` and `tabScrollMode`, but does not pass them to `TabHeader`.

- [ ] **Step 6: 运行 `contextmenu` 测试，确认通过**

Run:

```bash
pnpm vitest run src/lib/components/TabHeader/index.spec.ts
```

Expected:

```text
PASS  src/lib/components/TabHeader/index.spec.ts
```

- [ ] **Step 7: 运行相关基础检查**

Run:

```bash
pnpm test
pnpm type-check
```

Expected:

```text
pnpm test       # PASS
pnpm type-check # PASS
```

If `type-check` fails because the public `contextmenu?: boolean | object` type rejects array-specific code, do not narrow the public prop. Keep the prop type as-is and use `Array.isArray(props.contextmenu)` inside `normalizedContextMenu`.

- [ ] **Step 8: 提交本任务**

Only run this if the user has explicitly approved committing.

```bash
git add src/lib/components/TabHeader/index.spec.ts src/lib/components/TabHeader/index.vue src/lib/StackTabs.vue
git commit -m "fix: align tab context menu behavior"
```

---

### Task 2: 修复 `TabScrollMode` 行为

**Files:**
- Create: `src/lib/components/TabHeader/TabHeaderScroll.spec.ts`
- Modify: `src/lib/components/TabHeader/TabHeaderScroll.vue`

**Interfaces:**
- Consumes:
  - Props from `TabHeaderScroll.vue`:
    - `space?: number`
    - `isScrollWheel?: boolean`
    - `isScrollButton?: boolean`
- Produces:
  - `handleWheelScroll(e: WheelEvent): void` that no-ops when `props.isScrollWheel` is false.
  - `updateScrollButtonState(data: ScrollData): void` that sets `isScrollButtonVisible` only when `props.isScrollButton` is true and content overflows.

- [ ] **Step 1: 写 `TabScrollMode` 失败测试**

Create `src/lib/components/TabHeader/TabHeaderScroll.spec.ts` with this content:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import type { Component } from 'vue'
import TabHeaderScroll from './TabHeaderScroll.vue'

vi.mock('@/lib/utils/scrollUtils', () => ({
  scrollTo: ({ wrap, left, top }: { wrap: HTMLElement | null; left?: number; top?: number }) => {
    if (!wrap) return
    wrap.scrollLeft = left ?? 0
    wrap.scrollTop = top ?? 0
  },
  scrollIntoView: vi.fn()
}))

const ResizeObserverMock = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}))

const TabHeaderButtonStub = defineComponent({
  name: 'TabHeaderButton',
  props: {
    iconClass: String,
    disabled: Boolean
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          class: ['tab-header-button-stub', props.iconClass],
          disabled: props.disabled,
          onClick: () => emit('click')
        },
        props.iconClass
      )
  }
})

function setReadonlyNumberProperty(element: Element, key: 'clientWidth' | 'scrollWidth', value: number) {
  Object.defineProperty(element, key, {
    configurable: true,
    value
  })
}

function setScrollLeft(element: Element, value: number) {
  Object.defineProperty(element, 'scrollLeft', {
    configurable: true,
    writable: true,
    value
  })
}

async function mountScrollableHeaderScroll(props: Record<string, unknown>) {
  const wrapper = mount(TabHeaderScroll, {
    props: {
      space: 50,
      ...props
    },
    slots: {
      default: '<ul class="stack-tab__nav"><li class="stack-tab__item is-active">Tab</li></ul>'
    },
    global: {
      stubs: {
        TabHeaderButton: TabHeaderButtonStub as Component
      }
    }
  })

  const container = wrapper.find('.stack-tab__scroll-container').element
  setReadonlyNumberProperty(container, 'clientWidth', 100)
  setReadonlyNumberProperty(container, 'scrollWidth', 500)
  setScrollLeft(container, 0)

  await wrapper.find('.stack-tab__scroll-container').trigger('scroll')
  await nextTick()

  return { wrapper, container: container as HTMLElement }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  ResizeObserverMock.mockClear()
})

describe('TabHeaderScroll scroll mode gates', () => {
  it('WHEEL 模式：滚轮可滚动，左右按钮不显示', async () => {
    const { wrapper, container } = await mountScrollableHeaderScroll({
      isScrollWheel: true,
      isScrollButton: false
    })

    await wrapper.find('.stack-tab__scroll').trigger('wheel', { deltaY: 100 })

    expect(container.scrollLeft).toBe(50)
    expect(wrapper.findAll('.tab-header-button-stub')).toHaveLength(0)
  })

  it('BUTTON 模式：左右按钮显示，滚轮不改变滚动位置', async () => {
    const { wrapper, container } = await mountScrollableHeaderScroll({
      isScrollWheel: false,
      isScrollButton: true
    })

    await wrapper.find('.stack-tab__scroll').trigger('wheel', { deltaY: 100 })

    expect(container.scrollLeft).toBe(0)
    expect(wrapper.findAll('.tab-header-button-stub')).toHaveLength(2)
  })

  it('BOTH 模式：左右按钮显示，滚轮也可滚动', async () => {
    const { wrapper, container } = await mountScrollableHeaderScroll({
      isScrollWheel: true,
      isScrollButton: true
    })

    await wrapper.find('.stack-tab__scroll').trigger('wheel', { deltaY: 100 })

    expect(container.scrollLeft).toBe(50)
    expect(wrapper.findAll('.tab-header-button-stub')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run:

```bash
pnpm vitest run src/lib/components/TabHeader/TabHeaderScroll.spec.ts
```

Expected:

```text
FAIL  src/lib/components/TabHeader/TabHeaderScroll.spec.ts
```

至少应出现以下失败之一：

- `isScrollButton=false` 时按钮仍渲染。
- `isScrollWheel=false` 时 wheel 仍改变 `scrollLeft`。

- [ ] **Step 3: 修改 `TabHeaderScroll.vue` 的按钮可见状态**

In `src/lib/components/TabHeader/TabHeaderScroll.vue`, replace:

```ts
/** 是否有横向滚动条（内容超出时显示左右箭头） */
const isScrollButtonVisible = ref<boolean>(true)
```

with:

```ts
/** 是否显示左右滚动按钮：必须启用按钮模式且内容横向溢出 */
const isScrollButtonVisible = ref<boolean>(false)
```

Then replace `updateScrollButtonState` with:

```ts
/** 根据滚动位置更新左右箭头禁用状态及滚动按钮可见性 */
const updateScrollButtonState = (data: ScrollData) => {
  const hasHorizontalOverflow = data.scrollWidth > data.clientWidth

  isDisabledLeftButton.value = data.scrollLeft <= 10
  isDisabledRightButton.value =
    data.clientWidth + data.scrollLeft - data.scrollWidth >= -10
  isScrollButtonVisible.value = props.isScrollButton && hasHorizontalOverflow
}
```

- [ ] **Step 4: 修改 `handleWheelScroll` 尊重 `isScrollWheel`**

In `src/lib/components/TabHeader/TabHeaderScroll.vue`, replace `handleWheelScroll` with:

```ts
const handleWheelScroll = (e: WheelEvent) => {
  if (!props.isScrollWheel || !container.value) return

  const isScrollUp = e.deltaY < 0
  scrollTo(container.value.scrollLeft + (isScrollUp ? -props.space : props.space))
}
```

- [ ] **Step 5: 增加 props 变化时的按钮状态刷新**

After the existing `watch(scrollData, ...)`, add:

```ts
watch(
  () => props.isScrollButton,
  () => updateScrollButtonState(scrollData)
)
```

This keeps the internal state correct if a consumer dynamically changes `tabScrollMode`.

- [ ] **Step 6: 运行 `TabHeaderScroll` 测试，确认通过**

Run:

```bash
pnpm vitest run src/lib/components/TabHeader/TabHeaderScroll.spec.ts
```

Expected:

```text
PASS  src/lib/components/TabHeader/TabHeaderScroll.spec.ts
```

- [ ] **Step 7: 运行相关基础检查**

Run:

```bash
pnpm test
pnpm type-check
```

Expected:

```text
pnpm test       # PASS
pnpm type-check # PASS
```

- [ ] **Step 8: 提交本任务**

Only run this if the user has explicitly approved committing.

```bash
git add src/lib/components/TabHeader/TabHeaderScroll.spec.ts src/lib/components/TabHeader/TabHeaderScroll.vue
git commit -m "fix: respect tab scroll mode"
```

---

### Task 3: 轻量收敛事件名类型

**Files:**
- Create: `src/lib/hooks/useTabEventBus.spec.ts`
- Modify: `src/lib/hooks/useTabEventBus.ts`
- Modify: `src/lib/hooks/useTabRouter.ts`
- Modify: `src/lib/StackTabs.vue`

**Interfaces:**
- Consumes:
  - Existing `TabEventType.PAGE_LOADING`
  - Existing `TabEventType.TAB_ACTIVE`
- Produces:
  - `TabEventType.FORWARD = 'FORWARD'`
  - `TabEventType.BACKWARD = 'BACKWARD'`
  - `TabEventType.REFRESH_IFRAME_POSTMESSAGE = 'REFRESH_IFRAME_POSTMESSAGE'`
  - `type TabEventPayloadMap = Record<TabEventType, unknown> & { ... }`
  - `useTabEmitter<T extends Record<EventType, unknown> = TabEventPayloadMap>(): Emitter<T>`

- [ ] **Step 1: 写事件名常量失败测试**

Create `src/lib/hooks/useTabEventBus.spec.ts` with this content:

```ts
import { describe, expect, it } from 'vitest'
import { TabEventType } from './useTabEventBus'

describe('TabEventType', () => {
  it('包含 StackTabs 和 useTabRouter 已有的路由切换事件名', () => {
    expect(TabEventType.FORWARD).toBe('FORWARD')
    expect(TabEventType.BACKWARD).toBe('BACKWARD')
  })

  it('包含 iframe postMessage 刷新事件名且保持文本兼容', () => {
    expect(TabEventType.REFRESH_IFRAME_POSTMESSAGE).toBe('REFRESH_IFRAME_POSTMESSAGE')
  })
})
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run:

```bash
pnpm vitest run src/lib/hooks/useTabEventBus.spec.ts
```

Expected:

```text
FAIL  src/lib/hooks/useTabEventBus.spec.ts
```

Expected failure reason:

```text
Property 'FORWARD' does not exist on type 'typeof TabEventType'
```

- [ ] **Step 3: 修改 `src/lib/hooks/useTabEventBus.ts`**

Replace the current `TabEventType` enum and `useTabEmitter` signature with this version. Keep the plugin install behavior unchanged.

```ts
/** 标签相关事件类型 */
export enum TabEventType {
  PAGE_LOADING = 'PAGE_LOADING',
  TAB_ACTIVE = 'TAB_ACTIVE',
  FORWARD = 'FORWARD',
  BACKWARD = 'BACKWARD',
  REFRESH_IFRAME_POSTMESSAGE = 'REFRESH_IFRAME_POSTMESSAGE'
}

export interface TabEventPayloadMap extends Record<EventType, unknown> {
  [TabEventType.PAGE_LOADING]: string
  [TabEventType.TAB_ACTIVE]: { id: string; isRoute?: boolean }
  [TabEventType.FORWARD]: void
  [TabEventType.BACKWARD]: void
  [TabEventType.REFRESH_IFRAME_POSTMESSAGE]: string
}

/** 获取标签事件总线，用于组件间通信 */
export const useTabEmitter = <T extends Record<EventType, unknown> = TabEventPayloadMap>(): Emitter<T> => {
  return inject('tabEmitter') as Emitter<T>
}
```

The top of the file should still import:

```ts
import type { Emitter, EventType } from 'mitt'
import mitt from 'mitt'
import { type App, inject } from 'vue'
```

Do not change:

```ts
const eventBus = mitt<Record<EventType, unknown>>()

const plugin = {
  install(app: App) {
    app.provide('tabEmitter', eventBus)
  }
}
```

- [ ] **Step 4: 修改 `src/lib/hooks/useTabRouter.ts` 使用事件常量**

Replace:

```ts
import { useTabEmitter } from './useTabEventBus'
```

with:

```ts
import { TabEventType, useTabEmitter } from './useTabEventBus'
```

Remove these constants:

```ts
/** StackTabs 监听此事件切换前进动画 */
const ROUTER_EVENT_FORWARD = 'FORWARD'
/** StackTabs 监听此事件切换后退动画 */
const ROUTER_EVENT_BACKWARD = 'BACKWARD'
```

Replace:

```ts
emitter.emit(ROUTER_EVENT_FORWARD)
```

with:

```ts
emitter.emit(TabEventType.FORWARD)
```

Replace:

```ts
emitter.emit(ROUTER_EVENT_BACKWARD)
```

with:

```ts
emitter.emit(TabEventType.BACKWARD)
```

- [ ] **Step 5: 修改 `src/lib/StackTabs.vue` 使用事件常量**

Replace:

```ts
import { useTabEmitter } from '@/lib/hooks/useTabEventBus'
```

with:

```ts
import { TabEventType, useTabEmitter } from '@/lib/hooks/useTabEventBus'
```

Replace:

```ts
emitter.on('FORWARD', forwardHandler)
emitter.on('BACKWARD', backwardHandler)
```

with:

```ts
emitter.on(TabEventType.FORWARD, forwardHandler)
emitter.on(TabEventType.BACKWARD, backwardHandler)
```

Replace:

```ts
;(emitter as { on: (t: string, h: (p: unknown) => void) => void }).on(
  'REFRESH_IFRAME_POSTMESSAGE',
  handleRefreshIframePostMessage
)
```

with:

```ts
emitter.on(TabEventType.REFRESH_IFRAME_POSTMESSAGE, handleRefreshIframePostMessage)
```

Replace:

```ts
;(emitter as { off: (t: string, h: (p: unknown) => void) => void }).off(
  'REFRESH_IFRAME_POSTMESSAGE',
  handleRefreshIframePostMessage
)
emitter.off('FORWARD', forwardHandler)
emitter.off('BACKWARD', backwardHandler)
```

with:

```ts
emitter.off(TabEventType.REFRESH_IFRAME_POSTMESSAGE, handleRefreshIframePostMessage)
emitter.off(TabEventType.FORWARD, forwardHandler)
emitter.off(TabEventType.BACKWARD, backwardHandler)
```

- [ ] **Step 6: 运行事件名测试，确认通过**

Run:

```bash
pnpm vitest run src/lib/hooks/useTabEventBus.spec.ts
```

Expected:

```text
PASS  src/lib/hooks/useTabEventBus.spec.ts
```

- [ ] **Step 7: 运行类型检查，确认事件 payload 类型没有破坏现有代码**

Run:

```bash
pnpm type-check
```

Expected:

```text
PASS
```

If `mitt` reports `void` handler incompatibility for `FORWARD` or `BACKWARD`, change only those two payload types from `void` to `undefined` and call them as `emitter.emit(TabEventType.FORWARD, undefined)` / `emitter.emit(TabEventType.BACKWARD, undefined)`. Do not change event names.

- [ ] **Step 8: 运行全量测试**

Run:

```bash
pnpm test
```

Expected:

```text
PASS
```

- [ ] **Step 9: 提交本任务**

Only run this if the user has explicitly approved committing.

```bash
git add src/lib/hooks/useTabEventBus.spec.ts src/lib/hooks/useTabEventBus.ts src/lib/hooks/useTabRouter.ts src/lib/StackTabs.vue
git commit -m "refactor: centralize tab event names"
```

---

### Task 4: 最终验证与覆盖率记录

**Files:**
- Modify: none unless verification reveals failures.
- Read/record only: command output from test, type-check, build, coverage.

**Interfaces:**
- Consumes:
  - Behavior fixed in Task 1, Task 2, Task 3.
- Produces:
  - A concise verification summary for the user with exact pass/fail status.
  - If coverage is below 80%, a note explaining existing baseline gap and whether this change added regression tests for modified code.

- [ ] **Step 1: 运行单元测试**

Run:

```bash
pnpm test
```

Expected:

```text
PASS
```

If this fails, do not claim completion. Capture the failing test names and fix the smallest relevant issue.

- [ ] **Step 2: 运行类型检查**

Run:

```bash
pnpm type-check
```

Expected:

```text
PASS
```

If this fails, do not widen types with `any`. Use `unknown`, existing project types, or local narrowing.

- [ ] **Step 3: 运行生产构建**

Run:

```bash
pnpm build
```

Expected:

```text
PASS
```

If this fails because of build/type errors, use the `ecc:build-fix` skill or `ecc:build-error-resolver` agent before changing unrelated files.

- [ ] **Step 4: 运行覆盖率**

Run:

```bash
pnpm test:coverage
```

Expected:

```text
PASS
```

Record the coverage summary shown by Vitest. If total coverage is below 80%, report it exactly and explain whether the shortfall is pre-existing or introduced by this change. The modified behavior must still have focused regression tests from Tasks 1–3.

- [ ] **Step 5: 检查 git diff**

Run:

```bash
git diff -- src/lib/components/TabHeader/index.vue src/lib/components/TabHeader/index.spec.ts src/lib/components/TabHeader/TabHeaderScroll.vue src/lib/components/TabHeader/TabHeaderScroll.spec.ts src/lib/hooks/useTabEventBus.ts src/lib/hooks/useTabEventBus.spec.ts src/lib/hooks/useTabRouter.ts src/lib/StackTabs.vue
```

Expected:

- Only planned files changed.
- No package manifest or build config changed.
- No public API name changed.
- No new runtime dependency added.

- [ ] **Step 6: 请求代码审查**

Use the required code review flow after code changes:

```text
Invoke ecc:vue-review for Vue component and Composition API correctness.
Invoke ecc:typescript-reviewer or ecc:code-reviewer for TypeScript/event typing review.
```

Reviewers should specifically check:

- `contextmenu=false` does not open custom menu and does not break left-click activation.
- Custom `IContextMenu[]` reaches `ContextMenu` unchanged.
- `TabScrollMode.WHEEL/BUTTON/BOTH` behavior matches the table in the spec.
- Event names remain text-compatible.
- No hidden API break or new dependency.

- [ ] **Step 7: 发送最终验证摘要**

Report to the user in this format:

```markdown
完成状态：
- contextmenu 行为：已修复 / 未完成
- TabScrollMode 行为：已修复 / 未完成
- 事件名收敛：已完成 / 未完成

验证：
- pnpm test: PASS/FAIL
- pnpm type-check: PASS/FAIL
- pnpm build: PASS/FAIL
- pnpm test:coverage: PASS/FAIL，覆盖率：<粘贴摘要>

变更文件：
- <文件 1>
- <文件 2>

注意事项：
- <如有覆盖率基线不足或非阻塞风险，写清楚>
```

- [ ] **Step 8: 提交最终验证记录**

Only run this if the user has explicitly approved committing and there are uncommitted changes from prior tasks.

```bash
git status --short
```

If all planned code changes are already committed task-by-task, do not create an empty commit. If the user asks for one final squashed commit instead, follow the project git workflow and use a conventional commit message such as:

```bash
git add src/lib/components/TabHeader/index.vue src/lib/components/TabHeader/index.spec.ts src/lib/components/TabHeader/TabHeaderScroll.vue src/lib/components/TabHeader/TabHeaderScroll.spec.ts src/lib/hooks/useTabEventBus.ts src/lib/hooks/useTabEventBus.spec.ts src/lib/hooks/useTabRouter.ts src/lib/StackTabs.vue
git commit -m "fix: align tab menu and scroll behavior"
```

---

## Self-Review

### Spec coverage

- `contextmenu` 默认启用、显式禁用、自定义菜单传递：Task 1。
- `TabScrollMode.WHEEL/BUTTON/BOTH` 行为：Task 2。
- 事件名文本保持不变并集中定义：Task 3。
- 完全兼容、不改公开 API、不引入依赖：Global Constraints + Task 4 diff check。
- 覆盖率验证：Task 4。

### Placeholder scan

本计划不包含未完成占位语句或泛泛说明。每个代码步骤包含具体文件、具体代码片段和验证命令。

### Type consistency

- `contextmenu` 公开 prop 仍为 `boolean | object`，内部通过 `Array.isArray` 缩窄为 `IContextMenu[]`。
- `TabEventType` 中新增的事件名文本与现有裸字符串完全一致。
- `TabHeaderScroll` 的 props 名保持 `isScrollWheel` / `isScrollButton`，template 中继续使用 kebab-case 绑定。
