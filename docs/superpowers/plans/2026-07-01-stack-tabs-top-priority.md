# Stack Tabs Top Priority Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 `vue-stack-tabs` 三项最高优先级改造：ESM-only 发布与子路径导出、标签/菜单可访问性、iframe 安全策略与错误态。

**Architecture:** 采用小步 TDD：先用 Vitest 锁定 package exports、iframe bridge、安全属性和键盘行为，再最小实现。root 入口继续服务主应用；`vue-stack-tabs/iframe-bridge` 成为无样式副作用的子入口；Nuxt module 构建到 `dist/nuxt/module.mjs`。组件层保持现有视觉 class 和事件 API，只替换语义元素、补充 ARIA 与键盘处理。

**Tech Stack:** Vue 3、Vue Router、Vitest、Vue Test Utils、Vite library build、vite-plugin-dts、Nuxt module kit。

## Global Constraints

- 仅支持 ESM，不支持 CommonJS `require('vue-stack-tabs')`。
- 不引入新的 UI 库。
- 不实现拖拽排序、pin tab、最近关闭恢复或全局快捷键系统。
- 所有行为变更必须先写失败测试，再写实现。
- 保留现有视觉 class，避免大规模样式重设计。
- 继续使用现有 `test/**/*.{test,spec}.{ts,tsx}` 测试目录。
- 代码注释、文档说明使用中文；代码标识符保持英文。

---

## File Structure

### Create

- `src/lib/iframe-bridge.ts`：无副作用子入口，只 re-export iframe bridge 工具。
- `vite.config.iframe-bridge.ts`：构建 `dist/iframe-bridge.mjs`。
- `vite.config.nuxt.ts`：构建 `dist/nuxt/module.mjs`。
- `test/lib/packageExports.spec.ts`：验证 `package.json` exports 为 ESM-only，并包含 iframe bridge / Nuxt dist 子路径。
- `test/lib/components/TabHeader/TabHeaderButton.spec.ts`：验证 header 按钮语义。
- `test/lib/components/TabHeader/TabHeaderItem.spec.ts`：验证单 tab 语义和键盘行为。
- `test/lib/components/ContextMenu/ContextMenuItem.spec.ts`：验证菜单项 button/menuitem/disabled。
- `test/lib/components/ContextMenu/index.spec.ts`：验证菜单角色、焦点和键盘导航。
- `test/lib/components/PageLoading.spec.ts`：验证 loading 状态语义。
- `test/lib/StackTabs.iframe.spec.ts`：验证 iframe 安全属性、loading timeout、slot 与重试行为。

### Modify

- `package.json`：移除 CommonJS require 承诺，增加 `./iframe-bridge` 和 dist Nuxt exports，更新 `lib:build`。
- `vite.config.lib.ts`：root library 改为 ESM-only，保持 `dist/vue-stack-tabs.es.js`。
- `tsconfig.lib.json`：纳入 `src/lib/nuxt` 类型产物。
- `scripts/verify-packaged.mjs`：验证真实 dist exports、iframe bridge 子路径、Nuxt 子路径 resolve。
- `src/lib/utils/iframeBridge.ts`：增加 `targetOrigin` 和 `allowedOrigins`。
- `src/lib/model/TabModel.ts`：`IContextMenu` 增加可选 `key?: string`。
- `src/lib/components/TabHeader/TabHeaderButton.vue`：根节点改为 button，增加 `ariaLabel`。
- `src/lib/components/TabHeader/TabHeaderItem.vue`：补充 tab 语义和键盘行为，关闭按钮改为 button。
- `src/lib/components/TabHeader/index.vue`：tablist 语义、方向键导航、最大化按钮 aria 文案。
- `src/lib/components/ContextMenu/ContextMenuItem.vue`：根节点改为 button/menuitem，显式 disabled prop。
- `src/lib/components/ContextMenu/index.vue`：menu 语义、焦点管理、键盘导航、稳定 key。
- `src/lib/components/PageLoading.vue`：增加 `role="status"` 和 `aria-live="polite"`。
- `src/lib/StackTabs.vue`：新增 iframe props、load state、timeout/error slot、iframe 安全属性。
- `src/lib/i18n/lang/zh-CN.ts`、`src/lib/i18n/lang/en.ts`：增加 iframe title、timeout、retry、新窗口打开文案。
- `README.md`：记录 ESM-only、iframe bridge 子路径、iframe sandbox/referrer 策略。

---

### Task 1: Package exports and build entries

**Files:**

- Create: `src/lib/iframe-bridge.ts`
- Create: `vite.config.iframe-bridge.ts`
- Create: `vite.config.nuxt.ts`
- Create: `test/lib/packageExports.spec.ts`
- Modify: `package.json:10-22,31-33,63`
- Modify: `vite.config.lib.ts:20-44`
- Modify: `tsconfig.lib.json:2-4`

**Interfaces:**

- Consumes: existing `src/lib/utils/iframeBridge.ts` exports.
- Produces: `vue-stack-tabs/iframe-bridge` ESM import path; `vue-stack-tabs/nuxt` dist import path; root ESM-only package exports.

- [ ] **Step 1: Write the failing package exports test**

Create `test/lib/packageExports.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface PackageExportEntry {
  types?: string
  import?: string
  default?: string
  require?: string
}

interface PackageJsonShape {
  type?: string
  main?: string
  module?: string
  typings?: string
  exports?: Record<string, string | PackageExportEntry>
}

const readPackageJson = (): PackageJsonShape =>
  JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJsonShape

describe('package exports', () => {
  it('root export is ESM-only and does not advertise CommonJS require', () => {
    const pkg = readPackageJson()
    const rootExport = pkg.exports?.['.'] as PackageExportEntry

    expect(pkg.type).toBe('module')
    expect(rootExport.import).toBe('./dist/vue-stack-tabs.es.js')
    expect(rootExport.types).toBe('./dist/index.d.ts')
    expect(rootExport.require).toBeUndefined()
    expect(pkg.main).toBe('./dist/vue-stack-tabs.es.js')
    expect(pkg.module).toBe('./dist/vue-stack-tabs.es.js')
  })

  it('exposes side-effect-free iframe bridge and dist Nuxt module subpaths', () => {
    const pkg = readPackageJson()
    const iframeBridgeExport = pkg.exports?.['./iframe-bridge'] as PackageExportEntry
    const nuxtExport = pkg.exports?.['./nuxt'] as PackageExportEntry

    expect(iframeBridgeExport).toEqual({
      types: './dist/iframe-bridge.d.ts',
      import: './dist/iframe-bridge.mjs'
    })
    expect(nuxtExport).toEqual({
      types: './dist/nuxt/module.d.ts',
      import: './dist/nuxt/module.mjs'
    })
  })
})
```

- [ ] **Step 2: Run the package exports test to verify RED**

Run:

```bash
pnpm vitest run test/lib/packageExports.spec.ts
```

Expected: FAIL because `exports['.'].require` still exists and `./iframe-bridge` points do not exist.

- [ ] **Step 3: Create the side-effect-free iframe bridge entry**

Create `src/lib/iframe-bridge.ts`:

```ts
export { MSG_OPEN_TAB, MSG_REFRESH, onRefreshRequest, postOpenTab } from './utils/iframeBridge'
export type {
  IframeBridgeOptions,
  IframeOpenTabPayload,
  RefreshRequestOptions
} from './utils/iframeBridge'
```

This file will fail type-check until Task 2 adds `IframeBridgeOptions` and `RefreshRequestOptions`.

- [ ] **Step 4: Update package exports to ESM-only**

Modify `package.json` export fields to this shape:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/vue-stack-tabs.es.js"
    },
    "./iframe-bridge": {
      "types": "./dist/iframe-bridge.d.ts",
      "import": "./dist/iframe-bridge.mjs"
    },
    "./nuxt": {
      "types": "./dist/nuxt/module.d.ts",
      "import": "./dist/nuxt/module.mjs"
    },
    "./dist/style.css": "./dist/style.css",
    "./dist/vue-stack-tabs.css": "./dist/vue-stack-tabs.css"
  },
  "main": "./dist/vue-stack-tabs.es.js",
  "module": "./dist/vue-stack-tabs.es.js",
  "typings": "./dist/index.d.ts"
}
```

Only replace those fields; preserve unrelated package metadata, scripts and dependencies.

- [ ] **Step 5: Make root lib build ESM-only**

In `vite.config.lib.ts`, set library formats explicitly while keeping the same root output file:

```ts
lib: {
  entry: resolve(__dirname, 'src/lib/index.ts'),
  name: 'vue-stack-tabs',
  formats: ['es'],
  fileName: () => 'vue-stack-tabs.es.js'
}
```

Keep existing Vue plugins, alias, terser production settings and externals.

- [ ] **Step 6: Add iframe bridge build config**

Create `vite.config.iframe-bridge.ts`:

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/lib/iframe-bridge.ts'),
      formats: ['es'],
      fileName: () => 'iframe-bridge.mjs'
    },
    rollupOptions: {
      external: ['vue-router']
    }
  }
})
```

- [ ] **Step 7: Add Nuxt module build config**

Create `vite.config.nuxt.ts`:

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist/nuxt',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/lib/nuxt/module.ts'),
      formats: ['es'],
      fileName: () => 'module.mjs'
    },
    rollupOptions: {
      external: ['nuxt/kit']
    }
  }
})
```

- [ ] **Step 8: Include Nuxt sources in lib type generation**

Modify `tsconfig.lib.json`:

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "include": ["env.d.ts", "src/lib/**/*", "src/lib/**/*.vue"],
  "exclude": ["src/**/__tests__/*"],
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.lib.tsbuildinfo",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 9: Update lib build script**

Modify `package.json` `lib:build` script to run all three builds and copy CSS:

```json
"lib:build": "vite --config vite.config.lib.ts build && vite --config vite.config.iframe-bridge.ts build && vite --config vite.config.nuxt.ts build && node -e \"const fs=require('fs');fs.copyFileSync('dist/vue-stack-tabs.css','dist/style.css');if(fs.existsSync('dist/src/lib/iframe-bridge.d.ts'))fs.copyFileSync('dist/src/lib/iframe-bridge.d.ts','dist/iframe-bridge.d.ts');if(fs.existsSync('dist/src/lib/nuxt/module.d.ts')){fs.mkdirSync('dist/nuxt',{recursive:true});fs.copyFileSync('dist/src/lib/nuxt/module.d.ts','dist/nuxt/module.d.ts')}\""
```

- [ ] **Step 10: Run package exports test to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/packageExports.spec.ts
```

Expected: PASS.

- [ ] **Step 11: Run root type check after Task 2 types exist**

Skip this step until Task 2 is complete because `src/lib/iframe-bridge.ts` references types added there. After Task 2, run:

```bash
pnpm run type-check
```

Expected: PASS.

---

### Task 2: iframeBridge targetOrigin and allowedOrigins

**Files:**

- Modify: `test/lib/utils/iframeBridge.spec.ts:1-50`
- Modify: `src/lib/utils/iframeBridge.ts:14-52`
- Modify: `src/lib/iframe-bridge.ts`

**Interfaces:**

- Produces: `IframeBridgeOptions`, `RefreshRequestOptions`, `postOpenTab(payload, options?)`, `onRefreshRequest(callback?, options?)`.
- Consumed by: Task 1 `src/lib/iframe-bridge.ts`, Task 8 docs.

- [ ] **Step 1: Write failing iframe bridge tests**

Append to `test/lib/utils/iframeBridge.spec.ts`:

```ts
it('postOpenTab 使用显式 targetOrigin 发送消息', () => {
  const spy = vi.spyOn(window.parent, 'postMessage')

  postOpenTab({ title: 'secure', path: '/secure' }, { targetOrigin: 'https://parent.example.com' })

  expect(spy).toHaveBeenCalledWith(
    { type: MSG_OPEN_TAB, payload: { title: 'secure', path: '/secure' } },
    'https://parent.example.com'
  )

  spy.mockRestore()
})

it('onRefreshRequest 配置 allowedOrigins 后拒绝不匹配的父窗口消息', () => {
  const cb = vi.fn()
  const off = onRefreshRequest(cb, { allowedOrigins: ['https://trusted.example.com'] })

  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: MSG_REFRESH },
      source: window.parent,
      origin: 'https://evil.example.com'
    })
  )

  expect(cb).not.toHaveBeenCalled()
  off()
})

it('onRefreshRequest 配置 allowedOrigins 后接受匹配的父窗口消息', () => {
  const cb = vi.fn()
  const off = onRefreshRequest(cb, { allowedOrigins: ['https://trusted.example.com'] })

  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: MSG_REFRESH },
      source: window.parent,
      origin: 'https://trusted.example.com'
    })
  )

  expect(cb).toHaveBeenCalledTimes(1)
  off()
})
```

- [ ] **Step 2: Run iframeBridge tests to verify RED**

Run:

```bash
pnpm vitest run test/lib/utils/iframeBridge.spec.ts
```

Expected: FAIL because `postOpenTab` and `onRefreshRequest` do not accept options.

- [ ] **Step 3: Update iframeBridge types and implementation**

Modify `src/lib/utils/iframeBridge.ts` so the top-level payload and option types are:

```ts
import type { LocationQueryRaw } from 'vue-router'

export const MSG_REFRESH = 'vue-stack-tabs:refresh'
export const MSG_OPEN_TAB = 'vue-stack-tabs:openTab'

export interface IframeOpenTabPayload {
  id?: string
  title: string
  path: string
  query?: LocationQueryRaw
  closable?: boolean
  refreshable?: boolean
  iframe?: boolean
  iframeRefreshMode?: 'postMessage' | 'reload'
}

export interface IframeBridgeOptions {
  targetOrigin?: string
}

export interface RefreshRequestOptions {
  allowedOrigins?: string[]
}
```

Replace `postOpenTab` with:

```ts
export function postOpenTab(
  payload: IframeOpenTabPayload,
  options: IframeBridgeOptions = {}
): void {
  if (typeof window === 'undefined' || !window.parent) return

  window.parent.postMessage({ type: MSG_OPEN_TAB, payload }, options.targetOrigin ?? '*')
}
```

Replace `onRefreshRequest` with:

```ts
export function onRefreshRequest(
  callback: () => void = () => window.location.reload(),
  options: RefreshRequestOptions = {}
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const allowedOrigins = options.allowedOrigins ?? []
  const handler = (ev: MessageEvent) => {
    if (ev.source !== window.parent) return
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(ev.origin)) return
    if (ev.data?.type === MSG_REFRESH) {
      callback()
    }
  }

  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}
```

- [ ] **Step 4: Run iframeBridge tests to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/utils/iframeBridge.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run package exports test after type additions**

Run:

```bash
pnpm vitest run test/lib/packageExports.spec.ts
```

Expected: PASS.

---

### Task 3: Accessible header buttons and tab items

**Files:**

- Create: `test/lib/components/TabHeader/TabHeaderButton.spec.ts`
- Create: `test/lib/components/TabHeader/TabHeaderItem.spec.ts`
- Modify: `src/lib/components/TabHeader/TabHeaderButton.vue:5-40`
- Modify: `src/lib/components/TabHeader/TabHeaderItem.vue:1-68`
- Modify: `src/lib/assets/style/stackTab.scss:60-85,163-261`

**Interfaces:**

- Produces: `TabHeaderButton` emits native click from `<button>`; `TabHeaderItem` still emits `active(item, element, isRoute)` and `close(item)`.
- Consumed by: `TabHeader/index.vue` and existing tests.

- [ ] **Step 1: Write failing TabHeaderButton test**

Create `test/lib/components/TabHeader/TabHeaderButton.spec.ts`:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TabHeaderButton from '@/lib/components/TabHeader/TabHeaderButton.vue'

describe('TabHeaderButton accessibility', () => {
  it('渲染为原生 button，并使用 title 作为默认 aria-label', () => {
    const wrapper = mount(TabHeaderButton, {
      props: {
        title: '向左滚动',
        iconClass: 'stack-tab__icon-left-arrow'
      }
    })

    const button = wrapper.get('button.stack-tab__header-button')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-label')).toBe('向左滚动')
    expect(button.attributes('title')).toBe('向左滚动')
  })

  it('disabled 使用原生 button 禁用语义', () => {
    const wrapper = mount(TabHeaderButton, {
      props: {
        disabled: true,
        title: '不可用'
      }
    })

    const button = wrapper.get('button.stack-tab__header-button')
    expect(button.attributes()).toHaveProperty('disabled')
  })

  it('ariaLabel 优先于 title', () => {
    const wrapper = mount(TabHeaderButton, {
      props: {
        title: '图标按钮',
        ariaLabel: '最大化标签容器'
      }
    })

    expect(wrapper.get('button').attributes('aria-label')).toBe('最大化标签容器')
  })
})
```

- [ ] **Step 2: Run TabHeaderButton test to verify RED**

Run:

```bash
pnpm vitest run test/lib/components/TabHeader/TabHeaderButton.spec.ts
```

Expected: FAIL because root element is currently `div` and `ariaLabel` prop does not exist.

- [ ] **Step 3: Implement TabHeaderButton button semantics**

Replace `src/lib/components/TabHeader/TabHeaderButton.vue` template with:

```vue
<template>
  <button
    type="button"
    class="stack-tab__header-button"
    :class="{
      'stack-tab__shadow-right': shadow === 'right',
      'stack-tab__shadow-left': shadow === 'left'
    }"
    :disabled="disabled"
    :title="title"
    :aria-label="ariaLabel || title"
  >
    <span v-if="!('icon' in $slots)" class="stack-tab__mask-button" :class="iconClass" />
    <span v-if="'icon' in $slots" class="stack-tab__button">
      <slot name="icon" />
    </span>
  </button>
</template>
```

Extend props with:

```ts
/** 辅助技术标签，未传时使用 title */
ariaLabel?: string
```

and default:

```ts
ariaLabel: ''
```

- [ ] **Step 4: Add button reset styles**

In `src/lib/assets/style/stackTab.scss`, within `&__header-button`, add reset declarations that preserve existing dimensions:

```scss
border: 0;
font: inherit;
appearance: none;
```

Keep existing `[disabled]` styles because native button will still match `[disabled]`.

- [ ] **Step 5: Run TabHeaderButton test to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/components/TabHeader/TabHeaderButton.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Write failing TabHeaderItem test**

Create `test/lib/components/TabHeader/TabHeaderItem.spec.ts`:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import mitt from 'mitt'
import { describe, expect, it, vi } from 'vitest'
import type { ITabItem } from '@/lib/model/TabModel'
import { tabEmitterKey } from '@/lib/hooks/useTabEventBus'
import TabHeaderItem from '@/lib/components/TabHeader/TabHeaderItem.vue'

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

function makeTab(overrides: Partial<ITabItem> = {}): ITabItem {
  return {
    id: 'tab-1',
    title: 'Dashboard',
    closable: true,
    refreshable: true,
    iframe: false,
    active: true,
    pages: { list: () => [] } as unknown as ITabItem['pages'],
    ...overrides
  }
}

function mountItem(item: ITabItem) {
  return mount(TabHeaderItem, {
    props: { item },
    global: {
      provide: {
        [tabEmitterKey as symbol]: mitt()
      }
    }
  })
}

describe('TabHeaderItem accessibility', () => {
  it('渲染为 tab button，并反映 active 状态', () => {
    const wrapper = mountItem(makeTab({ active: true }))
    const tab = wrapper.get('[role="tab"]')

    expect(tab.element.tagName).toBe('BUTTON')
    expect(tab.attributes('type')).toBe('button')
    expect(tab.attributes('aria-selected')).toBe('true')
    expect(tab.attributes('tabindex')).toBe('0')
  })

  it('非 active tab 不进入 tab 顺序', () => {
    const wrapper = mountItem(makeTab({ active: false }))

    expect(wrapper.get('[role="tab"]').attributes('tabindex')).toBe('-1')
  })

  it('Enter 和 Space 会激活 tab', async () => {
    const wrapper = mountItem(makeTab())
    const tab = wrapper.get('[role="tab"]')

    await tab.trigger('keydown', { key: 'Enter' })
    await tab.trigger('keydown', { key: ' ' })

    expect(wrapper.emitted('active')).toHaveLength(2)
  })

  it('Delete 和 Backspace 会关闭可关闭 tab', async () => {
    const wrapper = mountItem(makeTab({ closable: true }))
    const tab = wrapper.get('[role="tab"]')

    await tab.trigger('keydown', { key: 'Delete' })
    await tab.trigger('keydown', { key: 'Backspace' })

    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('关闭按钮是带 aria-label 的原生 button', async () => {
    const wrapper = mountItem(makeTab({ title: 'Dashboard', closable: true }))
    const closeButton = wrapper.get('button.stack-tab__item-button')

    expect(closeButton.attributes('type')).toBe('button')
    expect(closeButton.attributes('aria-label')).toBe('VueStackTab.close Dashboard')

    await closeButton.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
```

- [ ] **Step 7: Run TabHeaderItem test to verify RED**

Run:

```bash
pnpm vitest run test/lib/components/TabHeader/TabHeaderItem.spec.ts
```

Expected: FAIL because there is no `[role="tab"]` button and close button is a `div`.

- [ ] **Step 8: Implement TabHeaderItem semantics and keyboard handling**

Replace `TabHeaderItem.vue` template with a `li role="presentation"` containing a tab button and close button. Keep `stack-tab__item` class on the `li` so existing layout remains anchored:

```vue
<template>
  <li
    ref="tabElementRef"
    role="presentation"
    class="stack-tab__item"
    :class="{
      'is-active': item.active,
      'is-icon': item.closable
    }"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <button
      type="button"
      role="tab"
      class="stack-tab__item-tab"
      :aria-selected="item.active ? 'true' : 'false'"
      :tabindex="item.active ? 0 : -1"
      :title="title"
      @click="handleActivate(true)"
      @keydown="handleTabKeydown"
    >
      <span class="stack-tab__item-title">
        <span class="stack-tab__item-title-content">
          {{ title }}
        </span>
      </span>
    </button>
    <button
      v-if="item.closable"
      type="button"
      class="stack-tab__icon-close-fill stack-tab__item-button"
      :title="t('VueStackTab.close')"
      :aria-label="`${t('VueStackTab.close')} ${title}`"
      @click.stop="handleClose"
    />
  </li>
</template>
```

Add to script:

```ts
const handleTabKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleActivate(true)
    return
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && props.item.closable) {
    event.preventDefault()
    handleClose()
  }
}
```

Update title computed fallback to use the existing namespace consistently:

```ts
const title = computed<string>(() => props.item.title || t('VueStackTab.undefined'))
```

- [ ] **Step 9: Add tab button reset styles**

In `stackTab.scss`, under `&__item`, add:

```scss
&-tab {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0;
  color: inherit;
  cursor: inherit;
  background: transparent;
  border: 0;
  font: inherit;
  text-align: inherit;
  appearance: none;
  align-items: center;
}
```

Change `&-title` to keep its current flex behavior. Do not remove existing `&-title-content` truncation styles.

- [ ] **Step 10: Run TabHeaderItem test to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/components/TabHeader/TabHeaderItem.spec.ts
```

Expected: PASS.

- [ ] **Step 11: Run existing TabHeader tests for regression**

Run:

```bash
pnpm vitest run test/lib/components/TabHeader/index.spec.ts test/lib/components/TabHeader/TabHeaderScroll.spec.ts
```

Expected: PASS. If the existing middle-click test breaks because the event is now nested, keep `@click.middle.prevent="handleCloseTab(item as ITabItem)"` on `tab-header-item` usage in `TabHeader/index.vue` and ensure the component emits native events through its root `li`.

---

### Task 4: TabHeader tablist keyboard navigation

**Files:**

- Modify: `test/lib/components/TabHeader/index.spec.ts:1-244`
- Modify: `src/lib/components/TabHeader/index.vue:10-29,60-164`

**Interfaces:**

- Consumes: `TabHeaderItem` role tab buttons from Task 3.
- Produces: parent-managed tablist direction navigation.

- [ ] **Step 1: Add failing TabHeader keyboard navigation tests**

Append to `test/lib/components/TabHeader/index.spec.ts`:

```ts
describe('TabHeader keyboard navigation', () => {
  it('tablist 使用正确角色', () => {
    tabs.value = [makeTab({ id: 'tab-1', title: 'One', active: true })]
    const wrapper = mountHeader()

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
  })

  it('ArrowRight 激活下一个 tab，ArrowLeft 激活上一个 tab', async () => {
    tabs.value = [
      makeTab({ id: 'tab-1', title: 'One', active: true }),
      makeTab({ id: 'tab-2', title: 'Two', active: false }),
      makeTab({ id: 'tab-3', title: 'Three', active: false })
    ]
    const wrapper = mountHeader()
    const tablist = wrapper.get('[role="tablist"]')

    await tablist.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(activeTabMock).toHaveBeenLastCalledWith('tab-2', true)

    tabs.value = [
      makeTab({ id: 'tab-1', title: 'One', active: false }),
      makeTab({ id: 'tab-2', title: 'Two', active: true }),
      makeTab({ id: 'tab-3', title: 'Three', active: false })
    ]
    await nextTick()

    await tablist.trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(activeTabMock).toHaveBeenLastCalledWith('tab-1', true)
  })

  it('Home 和 End 激活首尾 tab', async () => {
    tabs.value = [
      makeTab({ id: 'tab-1', title: 'One', active: false }),
      makeTab({ id: 'tab-2', title: 'Two', active: true }),
      makeTab({ id: 'tab-3', title: 'Three', active: false })
    ]
    const wrapper = mountHeader()
    const tablist = wrapper.get('[role="tablist"]')

    await tablist.trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(activeTabMock).toHaveBeenLastCalledWith('tab-1', true)

    await tablist.trigger('keydown', { key: 'End' })
    await nextTick()
    expect(activeTabMock).toHaveBeenLastCalledWith('tab-3', true)
  })
})
```

- [ ] **Step 2: Run TabHeader index tests to verify RED**

Run:

```bash
pnpm vitest run test/lib/components/TabHeader/index.spec.ts
```

Expected: FAIL because no `role="tablist"` and no keydown handler exists.

- [ ] **Step 3: Add tablist semantics and keydown handler**

Modify `transition-group` in `TabHeader/index.vue`:

```vue
<transition-group
  key="tab-list-transition"
  tag="ul"
  class="stack-tab__nav"
  role="tablist"
  aria-orientation="horizontal"
  v-bind="tabTransitionProps"
  appear
  @keydown="handleTabListKeydown"
>
```

Add script helper:

```ts
const getActiveTabIndex = (): number => tabs.value.findIndex((tab) => tab.active)

const activateTabByIndex = (index: number) => {
  const item = tabs.value[index]
  if (!item) return
  handleActivateTab(item as ITabItem, undefined, true)
}

const handleTabListKeydown = (event: KeyboardEvent) => {
  const count = tabs.value.length
  if (count <= 0) return

  const currentIndex = getActiveTabIndex()
  const safeIndex = currentIndex >= 0 ? currentIndex : 0

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    activateTabByIndex((safeIndex + 1) % count)
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    activateTabByIndex((safeIndex - 1 + count) % count)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    activateTabByIndex(0)
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    activateTabByIndex(count - 1)
  }
}
```

- [ ] **Step 4: Update maximum button labels**

In `TabHeader/index.vue`, change maximum button props:

```vue
<tab-header-button
  :icon-class="maximum ? 'stack-tab__icon-restore' : 'stack-tab__icon-fullscreen'"
  :title="maximum ? t('VueStackTab.restore') : t('VueStackTab.maximum')"
  :aria-label="maximum ? t('VueStackTab.restore') : t('VueStackTab.maximum')"
  @click="maximum = !maximum"
/>
```

If `VueStackTab.restore` does not exist yet, add it in Task 8 with iframe i18n strings.

- [ ] **Step 5: Run TabHeader index tests to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/components/TabHeader/index.spec.ts
```

Expected: PASS.

---

### Task 5: Accessible ContextMenu and ContextMenuItem

**Files:**

- Create: `test/lib/components/ContextMenu/ContextMenuItem.spec.ts`
- Create: `test/lib/components/ContextMenu/index.spec.ts`
- Modify: `src/lib/components/ContextMenu/ContextMenuItem.vue:5-18`
- Modify: `src/lib/components/ContextMenu/index.vue:7-120`
- Modify: `src/lib/model/TabModel.ts:88-94`

**Interfaces:**

- Produces: `IContextMenu.key?: string`; context menu root role menu; item role menuitem.
- Consumed by: `TabHeader/index.vue` custom context menu forwarding.

- [ ] **Step 1: Write failing ContextMenuItem test**

Create `test/lib/components/ContextMenu/ContextMenuItem.spec.ts`:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContextMenuItem from '@/lib/components/ContextMenu/ContextMenuItem.vue'

describe('ContextMenuItem accessibility', () => {
  it('渲染为 menuitem button', () => {
    const wrapper = mount(ContextMenuItem, {
      props: {
        icon: 'stack-tab__icon-reload svg-mask',
        title: '刷新'
      }
    })

    const button = wrapper.get('button[role="menuitem"]')
    expect(button.attributes('type')).toBe('button')
    expect(button.text()).toContain('刷新')
  })

  it('disabled 使用原生禁用语义', () => {
    const wrapper = mount(ContextMenuItem, {
      props: {
        title: '不可用',
        disabled: true
      }
    })

    expect(wrapper.get('button').attributes()).toHaveProperty('disabled')
  })
})
```

- [ ] **Step 2: Run ContextMenuItem test to verify RED**

Run:

```bash
pnpm vitest run test/lib/components/ContextMenu/ContextMenuItem.spec.ts
```

Expected: FAIL because root is currently `div` and no disabled prop exists.

- [ ] **Step 3: Implement ContextMenuItem button semantics**

Replace `ContextMenuItem.vue` template with:

```vue
<template>
  <button type="button" role="menuitem" class="stack-tab__contextmenu-item" :disabled="disabled">
    <span class="stack-tab__contextmenu-icon" :class="icon" aria-hidden="true" />
    <span class="stack-tab__contextmenu-title" @contextmenu.prevent>{{ title }}</span>
  </button>
</template>
```

Replace props with:

```ts
withDefaults(
  defineProps<{
    /** 图标 class，如 stack-tab__icon-reload svg-mask */
    icon?: string
    /** 显示文本 */
    title: string
    /** 是否禁用 */
    disabled?: boolean
  }>(),
  {
    icon: '',
    disabled: false
  }
)
```

Add SCSS rule under context menu styles if no existing title spacing exists:

```scss
.stack-tab__contextmenu-title {
  margin-left: 8px;
}
```

- [ ] **Step 4: Run ContextMenuItem test to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/components/ContextMenu/ContextMenuItem.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Add IContextMenu key type**

Modify `src/lib/model/TabModel.ts` interface:

```ts
export interface IContextMenu {
  key?: string
  icon?: string
  title: string
  callback(id: string): void
  disabled: (tabData: ITabBase) => boolean
}
```

- [ ] **Step 6: Write failing ContextMenu integration tests**

Create `test/lib/components/ContextMenu/index.spec.ts`:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IContextMenu, ITabItem } from '@/lib/model/TabModel'
import ContextMenu from '@/lib/components/ContextMenu/index.vue'

const refreshTabMock = vi.fn()
const refreshAllTabsMock = vi.fn()
const closeTabMock = vi.fn()
const closeAllTabsMock = vi.fn()
const openInNewWindowMock = vi.fn()
const removeLeftTabsMock = vi.fn()
const removeRightTabsMock = vi.fn()
const removeOtherTabsMock = vi.fn()

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/lib/hooks/useTabActions', () => ({
  default: () => ({
    closeTab: closeTabMock,
    closeAllTabs: closeAllTabsMock,
    refreshTab: refreshTabMock,
    refreshAllTabs: refreshAllTabsMock,
    openInNewWindow: openInNewWindowMock
  })
}))

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    removeLeftTabs: removeLeftTabsMock,
    removeRightTabs: removeRightTabsMock,
    removeOtherTabs: removeOtherTabsMock
  })
}))

vi.mock('@/lib/utils/scrollUtils', () => ({
  getMaxZIndex: () => 100
}))

function makeTab(overrides: Partial<ITabItem> = {}): ITabItem {
  return {
    id: 'tab-1',
    title: 'Dashboard',
    closable: true,
    refreshable: true,
    iframe: false,
    active: true,
    pages: { list: () => [] } as unknown as ITabItem['pages'],
    ...overrides
  }
}

function mountMenu(contextMenu: IContextMenu[] = []) {
  return mount(ContextMenu, {
    props: {
      index: 0,
      left: 12,
      top: 24,
      tabItem: makeTab(),
      max: 2,
      contextMenu
    },
    attachTo: document.body
  })
}

beforeEach(() => {
  document.body.innerHTML = ''
  refreshTabMock.mockReset()
  refreshAllTabsMock.mockReset()
  closeTabMock.mockReset()
  closeAllTabsMock.mockReset()
  openInNewWindowMock.mockReset()
  removeLeftTabsMock.mockReset()
  removeRightTabsMock.mockReset()
  removeOtherTabsMock.mockReset()
})

describe('ContextMenu accessibility', () => {
  it('根节点是 menu，菜单项是 menuitem button，并自动聚焦第一个可用项', async () => {
    const wrapper = mountMenu()

    expect(wrapper.get('[role="menu"]').attributes('tabindex')).toBe('-1')
    const items = wrapper.findAll('[role="menuitem"]')
    expect(items.length).toBeGreaterThan(0)
    expect(document.activeElement).toBe(items[0]?.element)
  })

  it('Escape 关闭菜单', async () => {
    const wrapper = mountMenu()

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('ArrowDown 和 ArrowUp 在可用菜单项间移动焦点', async () => {
    const wrapper = mountMenu()
    const menu = wrapper.get('[role="menu"]')
    const items = wrapper.findAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')

    expect(document.activeElement).toBe(items[0]?.element)

    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1]?.element)

    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[0]?.element)
  })

  it('自定义菜单使用稳定 key 并点击后关闭菜单', async () => {
    const customCallback = vi.fn()
    const wrapper = mountMenu([
      {
        key: 'pin-tab',
        title: 'Pin tab',
        callback: customCallback,
        disabled: () => false
      }
    ])

    await wrapper.get('[data-menu-key="pin-tab"]').trigger('click')

    expect(customCallback).toHaveBeenCalledWith('tab-1')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
```

- [ ] **Step 7: Run ContextMenu integration tests to verify RED**

Run:

```bash
pnpm vitest run test/lib/components/ContextMenu/index.spec.ts
```

Expected: FAIL because menu roles, focus management and data-menu-key do not exist.

- [ ] **Step 8: Implement ContextMenu roles, keys and keyboard navigation**

Modify root `div` in `ContextMenu/index.vue`:

```vue
<div
  ref="menuElementRef"
  class="stack-tab__contextmenu"
  role="menu"
  tabindex="-1"
  :style="{
    left: `${menuPosition.left}px`,
    top: `${menuPosition.top}px`,
    'z-index': getMaxZIndex('.stack-tab,.stack-tab *')
  }"
  @keydown="handleMenuKeydown"
>
```

Pass boolean disabled values to all menu items, for example:

```vue
<context-menu-item
  icon="stack-tab__icon-reload svg-mask"
  :title="t('VueStackTab.reload')"
  :disabled="!tabItem.refreshable"
  @click="handleMenuItemClick(() => refreshTab(tabItem.id))"
/>
```

Render custom items with stable key and data attribute:

```vue
<context-menu-item
  v-for="item in contextMenu"
  :key="getCustomMenuKey(item)"
  :data-menu-key="getCustomMenuKey(item)"
  :icon="item.icon"
  :title="item.title"
  :disabled="item.disabled(tabItem)"
  @click="handleMenuItemClick(() => !item.disabled(tabItem) && item.callback(tabItem.id))"
/>
```

Add script helpers:

```ts
const getMenuButtons = (): HTMLButtonElement[] => {
  const root = menuElementRef.value
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).filter(
    (button) => !button.disabled
  )
}

const focusMenuItem = (index: number) => {
  const buttons = getMenuButtons()
  if (buttons.length <= 0) return
  const safeIndex = (index + buttons.length) % buttons.length
  buttons[safeIndex]?.focus()
}

const getFocusedMenuItemIndex = (): number => {
  const buttons = getMenuButtons()
  return buttons.findIndex((button) => button === document.activeElement)
}

const handleMenuKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    focusMenuItem(getFocusedMenuItemIndex() + 1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    focusMenuItem(getFocusedMenuItemIndex() - 1)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    focusMenuItem(0)
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    focusMenuItem(getMenuButtons().length - 1)
  }
}

const getCustomMenuKey = (item: IContextMenu): string =>
  item.key ?? `${item.title}-${item.icon ?? ''}`
```

In `onMounted`, after viewport position correction, focus first item:

```ts
focusMenuItem(0)
```

- [ ] **Step 9: Run ContextMenu tests to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/components/ContextMenu/ContextMenuItem.spec.ts test/lib/components/ContextMenu/index.spec.ts
```

Expected: PASS.

---

### Task 6: Loading status semantics

**Files:**

- Create: `test/lib/components/PageLoading.spec.ts`
- Modify: `src/lib/components/PageLoading.vue:7-13`

**Interfaces:**

- Produces: accessible loading status for internal page loading.
- Consumed by: `useTabPanel.tsx` cache wrapper.

- [ ] **Step 1: Write failing PageLoading accessibility test**

Create `test/lib/components/PageLoading.spec.ts`:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import mitt from 'mitt'
import { describe, expect, it, vi } from 'vitest'
import PageLoading from '@/lib/components/PageLoading.vue'
import { TabEventType, tabEmitterKey } from '@/lib/hooks/useTabEventBus'

vi.mock('@/lib/utils/scrollUtils', () => ({
  getMaxZIndex: () => 10
}))

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('PageLoading accessibility', () => {
  it('显示 loading 时使用 status 和 aria-live', async () => {
    const emitter = mitt()
    const wrapper = mount(PageLoading, {
      props: {
        tabId: 'tab-1'
      },
      global: {
        provide: {
          [tabEmitterKey as symbol]: emitter
        }
      }
    })

    emitter.emit(TabEventType.PAGE_LOADING, { tId: 'tab-1', value: true })
    await wrapper.vm.$nextTick()

    const status = wrapper.get('[role="status"]')
    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.attributes('aria-label')).toBe('VueStackTab.loading')
  })
})
```

- [ ] **Step 2: Run PageLoading test to verify RED**

Run:

```bash
pnpm vitest run test/lib/components/PageLoading.spec.ts
```

Expected: FAIL because role/status attributes do not exist.

- [ ] **Step 3: Implement PageLoading semantics**

Modify `PageLoading.vue` template root loading mask:

```vue
<div
  v-if="isLoading"
  class="stack-tab-loading-mask"
  role="status"
  aria-live="polite"
  :aria-label="t('VueStackTab.loading')"
  :style="{ zIndex: getMaxZIndex('.cache-page-wrapper *') }"
>
  <div class="stack-tab-loading--spin turn" aria-hidden="true" />
</div>
```

Add import and i18n setup:

```ts
import { useI18n } from 'vue-i18n-lite'
const { t } = useI18n()
```

- [ ] **Step 4: Run PageLoading test to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/components/PageLoading.spec.ts
```

Expected: PASS.

---

### Task 7: StackTabs iframe security props, load timeout and slots

**Files:**

- Create: `test/lib/StackTabs.iframe.spec.ts`
- Modify: `src/lib/StackTabs.vue:44-84,166-240,303-370`
- Modify: `src/lib/i18n/lang/zh-CN.ts`
- Modify: `src/lib/i18n/lang/en.ts`

**Interfaces:**

- Produces: `iframeSandbox`, `iframeReferrerPolicy`, `iframeAllow`, `iframeLoadTimeout`; iframe loading/error slots; retry behavior.
- Consumes: existing `iframeRefreshKeys` and iframe tab list.

- [ ] **Step 1: Write failing StackTabs iframe tests**

Create `test/lib/StackTabs.iframe.spec.ts`:

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { ITabItem } from '@/lib/model/TabModel'
import StackTabs from '@/lib/StackTabs.vue'

const tabs = ref<ITabItem[]>([])
const iframeRefreshKeys = ref<Record<string, number>>({})
const destroyMock = vi.fn()
const initializeMock = vi.fn()
const setMaxSizeMock = vi.fn()
const setGlobalScrollMock = vi.fn()
const setSessionPrefixMock = vi.fn()
const setIFramePathMock = vi.fn()
const openTabMock = vi.fn()

vi.mock('vue-i18n-lite', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    changeLocale: vi.fn()
  })
}))

vi.mock('@/lib/i18n/stackTabsLocale', () => ({
  applyStackTabsLocale: vi.fn()
}))

vi.mock('@/lib/hooks/useTabPanel', () => ({
  default: () => ({
    tabs,
    iframeRefreshKeys,
    destroy: destroyMock,
    initialize: initializeMock,
    setMaxSize: setMaxSizeMock,
    setGlobalScroll: setGlobalScrollMock,
    setSessionPrefix: setSessionPrefixMock
  })
}))

vi.mock('@/lib/hooks/useTabActions', () => ({
  default: () => ({
    setIFramePath: setIFramePathMock,
    openTab: openTabMock
  })
}))

const TabHeaderStub = defineComponent({
  name: 'TabHeader',
  emits: ['active'],
  setup() {
    return () => h('nav', { 'data-test': 'tab-header' })
  }
})

const StackKeepAliveStub = defineComponent({
  name: 'StackKeepAlive',
  emits: ['loaded'],
  setup() {
    return () => h('main', { 'data-test': 'stack-keep-alive' })
  }
})

function makeIframeTab(overrides: Partial<ITabItem> = {}): ITabItem {
  return {
    id: 'frame-1',
    title: 'Reports',
    closable: true,
    refreshable: true,
    iframe: true,
    iframeRefreshMode: 'reload',
    url: 'https://example.com/reports',
    active: true,
    pages: { list: () => [] } as unknown as ITabItem['pages'],
    ...overrides
  }
}

function mountStackTabs(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(StackTabs, {
    props: {
      iframePath: '/__iframe',
      ...props
    },
    slots,
    global: {
      stubs: {
        TabHeader: TabHeaderStub,
        StackKeepAlive: StackKeepAliveStub,
        transition: false,
        Transition: false,
        TransitionGroup: false
      }
    }
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  tabs.value = [makeIframeTab()]
  iframeRefreshKeys.value = {}
  destroyMock.mockReset()
  initializeMock.mockReset()
  setMaxSizeMock.mockReset()
  setGlobalScrollMock.mockReset()
  setSessionPrefixMock.mockReset()
  setIFramePathMock.mockReset()
  openTabMock.mockReset()
})

describe('StackTabs iframe security and states', () => {
  it('iframe 带有 title、sandbox、referrerpolicy 和 allow', () => {
    const wrapper = mountStackTabs({
      iframeSandbox: 'allow-scripts',
      iframeReferrerPolicy: 'no-referrer',
      iframeAllow: 'fullscreen'
    })

    const iframe = wrapper.get('iframe.stack-tab__iframe')
    expect(iframe.attributes('title')).toBe('Reports')
    expect(iframe.attributes('sandbox')).toBe('allow-scripts')
    expect(iframe.attributes('referrerpolicy')).toBe('no-referrer')
    expect(iframe.attributes('allow')).toBe('fullscreen')
  })

  it('iframe loading 使用 status 语义', () => {
    const wrapper = mountStackTabs()

    const loading = wrapper.get('.stack-tab__iframe-loading')
    expect(loading.attributes('role')).toBe('status')
    expect(loading.attributes('aria-live')).toBe('polite')
  })

  it('加载超时后显示 iframeError slot 并可重试', async () => {
    const wrapper = mountStackTabs(
      { iframeLoadTimeout: 50 },
      {
        iframeError:
          '<template #iframeError="{ tab, retry }"><button data-test="retry" @click="retry(tab.id)">retry {{ tab.id }}</button></template>'
      }
    )

    vi.advanceTimersByTime(51)
    await wrapper.vm.$nextTick()

    const retryButton = wrapper.get('[data-test="retry"]')
    expect(retryButton.text()).toContain('frame-1')

    await retryButton.trigger('click')
    expect(wrapper.find('.stack-tab__iframe-loading').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run StackTabs iframe tests to verify RED**

Run:

```bash
pnpm vitest run test/lib/StackTabs.iframe.spec.ts
```

Expected: FAIL because iframe attrs, timeout state and error slot do not exist.

- [ ] **Step 3: Add props and defaults**

In `StackTabs.vue` props type, add:

```ts
iframeSandbox?: string
iframeReferrerPolicy?: ReferrerPolicy
iframeAllow?: string
iframeLoadTimeout?: number
```

In defaults, add:

```ts
iframeSandbox: 'allow-scripts allow-forms allow-popups allow-downloads allow-same-origin',
iframeReferrerPolicy: 'strict-origin-when-cross-origin' as ReferrerPolicy,
iframeAllow: '',
iframeLoadTimeout: 15000
```

- [ ] **Step 4: Replace boolean iframe loading state with explicit state**

Add types and state near existing iframe loading declarations:

```ts
type IframeLoadStatus = 'idle' | 'loading' | 'loaded' | 'timeout'

interface IframeLoadState {
  status: IframeLoadStatus
  message?: string
}

const iframeLoadStates = reactive<Record<string, IframeLoadState>>({})
const getIframeLoadState = (frameId: string): IframeLoadState =>
  iframeLoadStates[frameId] ?? { status: 'idle' }
```

Replace `iframeHasLoaded` and `iframeLoadingStates` usages with `iframeLoadStates`. Keep `loadTimeoutIds` but use `props.iframeLoadTimeout` instead of fixed `LOAD_TIMEOUT_MS`.

- [ ] **Step 5: Implement loading, loaded, timeout and retry helpers**

Add helpers:

```ts
const clearIframeLoadTimeout = (frameId: string) => {
  const tid = loadTimeoutIds.get(frameId)
  if (!tid) return
  clearTimeout(tid)
  loadTimeoutIds.delete(frameId)
}

const setIframeLoaded = (frameId: string) => {
  clearIframeLoadTimeout(frameId)
  iframeLoadStates[frameId] = { status: 'loaded' }
}

const setIframeLoading = (frameId: string) => {
  const current = getIframeLoadState(frameId)
  if (current.status === 'loaded') return

  clearIframeLoadTimeout(frameId)
  iframeLoadStates[frameId] = { status: 'loading' }
  loadTimeoutIds.set(
    frameId,
    setTimeout(() => {
      loadTimeoutIds.delete(frameId)
      if (getIframeLoadState(frameId).status === 'loading') {
        iframeLoadStates[frameId] = {
          status: 'timeout',
          message: t('VueStackTab.iframeLoadTimeout')
        }
      }
    }, props.iframeLoadTimeout)
  )
}

const retryIframe = (frameId: string) => {
  iframeLoadStates[frameId] = { status: 'idle' }
  iframeRefreshKeys.value = {
    ...iframeRefreshKeys.value,
    [frameId]: (iframeRefreshKeys.value[frameId] ?? 0) + 1
  }
  setIframeLoading(frameId)
}

const shouldShowIframeLoading = (frameId: string) =>
  getIframeLoadState(frameId).status === 'loading'
const shouldShowIframeError = (frameId: string) => getIframeLoadState(frameId).status === 'timeout'
```

- [ ] **Step 6: Clean stale iframe state when tabs close**

Add a watcher:

```ts
watch(
  iframeTabs,
  (frames) => {
    const activeIds = new Set(frames.map((frame) => frame.id))
    for (const id of Object.keys(iframeLoadStates)) {
      if (!activeIds.has(id)) {
        clearIframeLoadTimeout(id)
        delete iframeLoadStates[id]
        delete iframeEverActivated[id]
        delete iframeElRefs[id]
      }
    }
  },
  { immediate: true }
)
```

- [ ] **Step 7: Update iframe template**

Replace iframe loading block with:

```vue
<div
  v-if="shouldShowIframeLoading(frame.id)"
  class="stack-tab__iframe-loading"
  role="status"
  aria-live="polite"
  :aria-label="t('VueStackTab.loading')"
>
  <slot name="iframeLoading" :tab="frame">
    <span class="stack-tab__iframe-loading-text">{{ t('VueStackTab.loading') }}</span>
  </slot>
</div>
<div v-if="shouldShowIframeError(frame.id)" class="stack-tab__iframe-error" role="alert">
  <slot name="iframeError" :tab="frame" :retry="retryIframe">
    <span class="stack-tab__iframe-error-text">{{ t('VueStackTab.iframeLoadTimeout') }}</span>
    <button type="button" class="stack-tab__iframe-error-retry" @click="retryIframe(frame.id)">
      {{ t('VueStackTab.retry') }}
    </button>
  </slot>
</div>
```

Update iframe attrs:

```vue
<iframe
  :key="iframeRefreshKeys[frame.id] || 0"
  :ref="(el) => setIframeRef(frame.id, el as HTMLIFrameElement | null)"
  class="stack-tab__iframe"
  :src="getIframeSrc(frame)"
  :title="frame.title || t('VueStackTab.iframeTitle') || 'Stack tab iframe'"
  :sandbox="iframeSandbox || undefined"
  :referrerpolicy="iframeReferrerPolicy"
  :allow="iframeAllow || undefined"
  frameborder="0"
  @load="setIframeLoaded(frame.id)"
/>
```

- [ ] **Step 8: Add i18n keys**

Add to `zh-CN.ts` under `VueStackTab`:

```ts
iframeTitle: '标签页内嵌页面',
iframeLoadTimeout: 'iframe 加载超时',
retry: '重试',
restore: '还原'
```

Add to `en.ts` under `VueStackTab`:

```ts
iframeTitle: 'Embedded tab page',
iframeLoadTimeout: 'IFrame loading timed out',
retry: 'Retry',
restore: 'Restore'
```

- [ ] **Step 9: Run StackTabs iframe tests to verify GREEN**

Run:

```bash
pnpm vitest run test/lib/StackTabs.iframe.spec.ts
```

Expected: PASS.

---

### Task 8: Packaged smoke verification and documentation

**Files:**

- Modify: `scripts/verify-packaged.mjs:1-45`
- Modify: `README.md`

**Interfaces:**

- Consumes: dist files from Tasks 1 and 2.
- Produces: verification that package exports resolve from a packed package.

- [ ] **Step 1: Update verify-packaged script to check dist entry files before playground builds**

Modify `scripts/verify-packaged.mjs` to check these files exist:

```js
const requiredDistFiles = [
  ['root ESM', join(root, 'dist', 'vue-stack-tabs.es.js')],
  ['root CSS', join(root, 'dist', 'style.css')],
  ['iframe bridge ESM', join(root, 'dist', 'iframe-bridge.mjs')],
  ['iframe bridge types', join(root, 'dist', 'iframe-bridge.d.ts')],
  ['Nuxt module ESM', join(root, 'dist', 'nuxt', 'module.mjs')],
  ['Nuxt module types', join(root, 'dist', 'nuxt', 'module.d.ts')]
]

for (const [label, filePath] of requiredDistFiles) {
  if (!fs.existsSync(filePath)) {
    console.error(`${label} 不存在：${filePath}`)
    process.exit(1)
  }
}
```

Keep existing Vue and Nuxt playground build checks after these file checks.

- [ ] **Step 2: Add packed package import smoke check**

In `scripts/verify-packaged.mjs`, after dist file checks and before playground builds, add a temp package check:

```js
async function runNodeScript(source, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      cwd,
      stdio: 'inherit',
      shell: false
    })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))))
  })
}

await runNodeScript(`
  import pkg from './package.json' with { type: 'json' }
  if (pkg.exports['.'].require) throw new Error('CommonJS require export should not exist')
  if (!pkg.exports['./iframe-bridge']) throw new Error('iframe bridge export missing')
  if (!pkg.exports['./nuxt']) throw new Error('Nuxt export missing')
  await import('./dist/vue-stack-tabs.es.js')
  const bridge = await import('./dist/iframe-bridge.mjs')
  if (typeof bridge.postOpenTab !== 'function') throw new Error('postOpenTab missing')
  if (typeof bridge.onRefreshRequest !== 'function') throw new Error('onRefreshRequest missing')
  console.log('dist ESM imports verified')
`)
```

- [ ] **Step 3: Run packaged verification to verify RED before build changes are complete**

Run after Task 1 but before running `pnpm run lib:build`:

```bash
pnpm run test:packaged
```

Expected: FAIL if dist has not been rebuilt with new subpath files.

- [ ] **Step 4: Run lib build and packaged verification to verify GREEN**

Run:

```bash
pnpm run lib:build
pnpm run test:packaged
```

Expected: PASS.

- [ ] **Step 5: Document ESM-only and iframe bridge subpath**

In `README.md`, add a section named `ESM-only 与 iframe bridge 子入口` with this content:

````md
## ESM-only 与 iframe bridge 子入口

`vue-stack-tabs` 从当前版本开始只承诺 ESM import，不再支持 `require('vue-stack-tabs')`。

主应用中继续使用 root 入口：

```ts
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'
```

iframe 内部页面建议使用无样式副作用的子入口：

```ts
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

postOpenTab(
  { title: '订单详情', path: '/orders/1' },
  { targetOrigin: 'https://parent.example.com' }
)

const off = onRefreshRequest(() => window.location.reload(), {
  allowedOrigins: ['https://parent.example.com']
})
```

生产环境建议显式传入 `targetOrigin` 和 `allowedOrigins`，避免 wildcard postMessage 策略。
````

- [ ] **Step 6: Document iframe policy props**

In `README.md`, add a section named `iframe 安全策略` with this content:

````md
## iframe 安全策略

`VueStackTabs` 支持配置 iframe 安全属性：

```vue
<VueStackTabs
  iframe-path="/__iframe"
  iframe-sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-same-origin"
  iframe-referrer-policy="strict-origin-when-cross-origin"
  iframe-allow="fullscreen"
  :iframe-load-timeout="15000"
/>
```

默认 sandbox 保留常见业务页面能力。如果你的页面需要更严格限制，可以减少 sandbox token；如果你的同源业务页面确实不能在 sandbox 下工作，可以传入空字符串关闭 sandbox，但这会降低隔离强度。
````

- [ ] **Step 7: Run README format check**

Run:

```bash
pnpm prettier --check README.md docs/superpowers/specs/2026-07-01-stack-tabs-top-priority-design.md docs/superpowers/plans/2026-07-01-stack-tabs-top-priority.md
```

Expected: PASS. If it fails, run:

```bash
pnpm prettier --write README.md docs/superpowers/specs/2026-07-01-stack-tabs-top-priority-design.md docs/superpowers/plans/2026-07-01-stack-tabs-top-priority.md
```

Then re-run the check.

---

### Task 9: Final verification and review

**Files:**

- No production file changes in this task unless earlier verification exposes a defect.

**Interfaces:**

- Consumes: all previous tasks.
- Produces: verified working branch ready for code review.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm vitest run \
  test/lib/packageExports.spec.ts \
  test/lib/utils/iframeBridge.spec.ts \
  test/lib/components/TabHeader/TabHeaderButton.spec.ts \
  test/lib/components/TabHeader/TabHeaderItem.spec.ts \
  test/lib/components/TabHeader/index.spec.ts \
  test/lib/components/ContextMenu/ContextMenuItem.spec.ts \
  test/lib/components/ContextMenu/index.spec.ts \
  test/lib/components/PageLoading.spec.ts \
  test/lib/StackTabs.iframe.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run full unit test suite**

Run:

```bash
pnpm run test
```

Expected: PASS.

- [ ] **Step 3: Run type check**

Run:

```bash
pnpm run type-check
```

Expected: PASS.

- [ ] **Step 4: Run lint check**

Run:

```bash
pnpm run lint:check
```

Expected: PASS. If it fails because `.claude/worktrees` is scanned, fix ESLint ignore configuration rather than ignoring source issues.

- [ ] **Step 5: Run library build**

Run:

```bash
pnpm run lib:build
```

Expected: PASS and these files exist:

```text
dist/vue-stack-tabs.es.js
dist/style.css
dist/iframe-bridge.mjs
dist/iframe-bridge.d.ts
dist/nuxt/module.mjs
dist/nuxt/module.d.ts
```

- [ ] **Step 6: Run packaged smoke verification**

Run:

```bash
pnpm run test:packaged
```

Expected: PASS.

- [ ] **Step 7: Request code review**

Use `superpowers:requesting-code-review` or the project `ecc:vue-review` / `ecc:code-review` path. Review must cover:

- Vue accessibility and keyboard behavior.
- iframe security properties and postMessage origin handling.
- package exports and build outputs.
- Tests exercising the new behavior.

- [ ] **Step 8: Address CRITICAL and HIGH review findings**

If review finds CRITICAL or HIGH issues, fix them with TDD when behavior changes. Re-run the focused test for that area and the final verification commands.

- [ ] **Step 9: Report completion with evidence**

Final response must include exact commands run and whether each passed. Do not claim completion unless verification output was observed.
