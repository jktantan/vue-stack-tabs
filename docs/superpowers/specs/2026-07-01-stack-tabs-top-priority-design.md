# Stack Tabs Top Priority Improvements Design

日期：2026-07-01

## 背景

`src/lib` 已具备堆叠式标签、keep-alive 缓存、iframe 标签、Nuxt 集成、i18n 与事件总线能力。当前最值得优先推进的三项改造是：

1. 可访问性改造：让标签栏、按钮、右键菜单、loading 状态具备正确语义和键盘可用性。
2. iframe 安全策略与错误态：为 iframe 提供明确安全边界、可配置策略、超时错误与重试体验。
3. 发布包 exports / Nuxt module dist 化：统一为 ESM-only 发布，拆分无副作用 iframe bridge 子入口，并让 Nuxt module 指向 dist 产物。

本设计不做大规模视觉重设计，不引入新 UI 库，不重写核心路由栈模型。所有行为变更必须通过 TDD 增量完成。

## 目标

- 保持现有主 API 基本兼容。
- 不改变现有视觉风格，仅做必要 DOM 语义、属性和小范围样式适配。
- 让 root 包入口适合主应用，iframe bridge 子入口适合 iframe 子页面。
- 让发布包不再承诺 CommonJS `require`，只支持 ESM。
- 让 Nuxt 使用构建后的 module 产物，而不是源码 TS。
- 补充覆盖关键行为的单元/组件/打包 smoke 测试。

## 非目标

- 不实现完整全局快捷键系统，例如 `Ctrl+W`、`Ctrl+Tab`。
- 不实现拖拽排序、pin tab、最近关闭恢复等新业务功能。
- 不重构整个 `useTabPanel.tsx`。
- 不自动探测远端页面的 `X-Frame-Options` 或 CSP `frame-ancestors`。
- 不支持 CommonJS `require('vue-stack-tabs')`。

## 设计一：发布/API 形态

### Root 入口

`vue-stack-tabs` 保持主应用入口：

```ts
import VueStackTabs from 'vue-stack-tabs'
import {
  VueStackTabs as VueStackTabsComponent,
  StackTab,
  useTabActions,
  useTabRouter,
  useTabLoading
} from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'
```

root 入口可以继续引入样式，适合主应用安装组件库。

### iframe bridge 子入口

新增无副作用子路径：

```ts
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'
```

该入口只导出 iframe 通信用的常量、函数和类型，不导入 Vue 组件、不导入样式、不执行版本日志。

### Nuxt 子入口

保留使用方式：

```ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt']
})
```

但 `package.json` 指向 dist 产物：

```json
"./nuxt": {
  "types": "./dist/nuxt/module.d.ts",
  "import": "./dist/nuxt/module.mjs"
}
```

### ESM-only

发布包不再承诺 CommonJS。移除或不再暴露 `exports['.'].require`，`main` 不再指向 UMD/CJS。真实消费以 ESM import 为准。

### 验收标准

- root ESM import 可用。
- CSS import 可用。
- `vue-stack-tabs/iframe-bridge` import 可用，且不拉入主样式。
- `vue-stack-tabs/nuxt` 指向 dist 文件。
- `require('vue-stack-tabs')` 不再作为受支持入口。
- packaged smoke test 验证真实发布入口，而不是 playground alias 或源码路径。

## 设计二：可访问性改造

### TabHeaderButton

`TabHeaderButton` 从 `div` 改成原生 button：

```vue
<button
  type="button"
  class="stack-tab__header-button"
  :disabled="disabled"
  :title="title"
  :aria-label="ariaLabel || title"
>
  ...
</button>
```

保留原 class，新增可选 `ariaLabel` prop。左右滚动按钮和最大化按钮复用该能力。

### TabHeaderItem

单个 tab 使用 tab 语义。外层 `li` 只承担列表项结构，实际交互元素使用 button：

```vue
<li role="presentation">
  <button
    type="button"
    role="tab"
    :aria-selected="item.active"
    :tabindex="item.active ? 0 : -1"
  >
    ...
  </button>
</li>
```

键盘行为：

- `Enter` / `Space` 激活当前 tab。
- `Delete` / `Backspace` 在可关闭时关闭当前 tab。
- 关闭图标改为独立 `<button type="button">`，带 `aria-label`，例如 `关闭 {title}`。
- 不实现浏览器级全局快捷键。

### Tab list 方向键

方向键导航由父级 tablist 容器管理，避免每个 item 查询兄弟节点。需要支持：

- `ArrowLeft` / `ArrowRight` 移动焦点并激活目标 tab。
- `Home` / `End` 移动到首尾 tab。

### ContextMenu

右键菜单补齐 menu 语义：

```vue
<div role="menu" tabindex="-1">
  <button role="menuitem" type="button">...</button>
</div>
```

行为：

- 菜单打开后聚焦第一个可用菜单项。
- `ArrowDown` / `ArrowUp` 在可用菜单项之间移动。
- `Home` / `End` 到首尾可用菜单项。
- `Enter` / `Space` 执行当前菜单项。
- `Escape` 关闭菜单。
- disabled 项使用原生 `disabled`，不可聚焦。

`IContextMenu` 增加可选 `key?: string`。渲染时优先使用 `item.key`，没有 key 时用 `title + icon` 组合兜底。文档建议业务自定义菜单提供稳定 key。

### Loading 状态

page loading 和 iframe loading 容器补充：

```html
role="status" aria-live="polite"
```

需要有可被辅助技术理解的文本或 `aria-label`。

### 验收标准

- 鼠标行为保持不变。
- tab 可以通过键盘激活和关闭。
- tablist 支持基础方向键导航。
- 右键菜单可以键盘操作和关闭。
- disabled 控件使用正确语义。
- loading 状态可被屏幕阅读器感知。
- 不引入新的 UI 库。
- 现有样式基本保持一致。
- 组件测试覆盖关键键盘行为。

## 设计三：iframe 安全策略和错误态

### 新增 StackTabs iframe props

`StackTabs.vue` 新增：

```ts
iframeSandbox?: string
iframeReferrerPolicy?: ReferrerPolicy
iframeAllow?: string
iframeLoadTimeout?: number
```

默认值：

```ts
iframeSandbox: 'allow-scripts allow-forms allow-popups allow-downloads allow-same-origin'
iframeReferrerPolicy: 'strict-origin-when-cross-origin'
iframeAllow: ''
iframeLoadTimeout: 15000
```

默认 sandbox 保留常见业务页面能力，降低破坏性。用户可以传更严格策略；如果需要完全不 sandbox，可以传空字符串，但文档必须提示风险。

### iframe title

iframe title 优先级：

1. `frame.title`
2. i18n key：`VueStackTab.iframeTitle`
3. `'Stack tab iframe'`

### 加载状态模型

引入状态：

```ts
type IframeLoadStatus = 'idle' | 'loading' | 'loaded' | 'timeout'

interface IframeLoadState {
  status: IframeLoadStatus
  message?: string
}
```

每个 iframe tab 按 id 管理状态：

```ts
Record<string, IframeLoadState>
```

行为：

- 首次激活真实 URL：进入 `loading`。
- `load` 事件触发：进入 `loaded`。
- 超过 `iframeLoadTimeout`：进入 `timeout`。
- reload refresh：重置为 `loading`。
- close tab：清理对应状态和 timeout。

### Slots

新增 slot：

```vue
<slot name="iframeLoading" :tab="frame">
  默认 loading UI
</slot>

<slot name="iframeError" :tab="frame" :retry="retryIframe">
  默认错误 UI
</slot>
```

默认错误 UI：

- 文案：`iframe 加载超时`。
- 按钮：`重试`。
- 如果 URL 合法，提供 `新窗口打开` 备用操作。

### iframe bridge origin 安全

`postOpenTab` 改为：

```ts
postOpenTab(payload, options?: { targetOrigin?: string }): void
```

兼容策略：

- 如果传入 `targetOrigin`，使用传入值。
- 如果未传，为兼容旧用法暂时仍使用 `'*'`。
- 文档推荐生产环境显式传入父页面 origin。

`onRefreshRequest` 改为：

```ts
onRefreshRequest(
  callback?: () => void,
  options?: { allowedOrigins?: string[] }
): () => void
```

如果传入 `allowedOrigins`，则 `ev.origin` 必须匹配。

### 验收标准

- iframe 具备 `title`、`referrerpolicy`、`sandbox`、`allow`。
- timeout 后显示错误态，不再永久 loading 或静默消失。
- reload refresh 会重新进入 loading。
- 关闭 tab 后清理 load state 和 timeout。
- bridge 支持 `targetOrigin` / `allowedOrigins`。
- 测试覆盖 URL 安全、bridge origin 校验、iframe timeout 状态。

## 测试策略

### RED-GREEN-REFACTOR

所有行为变更必须先写失败测试，再写实现。每一类行为至少有一个测试先观察到失败。

### 组件测试

使用现有 Vue Test Utils / Vitest 测试：

- `TabHeaderButton` 渲染为 button，支持 disabled 和 aria-label。
- `TabHeaderItem` tab 语义、Enter/Space 激活、Delete/Backspace 关闭。
- `ContextMenu` menu/menuitem 语义、Escape 关闭、方向键移动焦点。
- loading 容器具备 status/live 语义。
- `StackTabs` iframe 属性和 timeout/error slot 行为。

### 工具函数测试

- `postOpenTab` 使用显式 targetOrigin。
- `postOpenTab` 未传 targetOrigin 时保持旧兼容行为。
- `onRefreshRequest` 在 allowedOrigins 不匹配时不触发 callback。
- `onRefreshRequest` 在 source 不是 parent 时不触发 callback。

### 发布 smoke test

打包后验证：

- root ESM import。
- CSS import。
- `vue-stack-tabs/iframe-bridge` import。
- `vue-stack-tabs/nuxt` import。
- 不验证 CJS require，因为不再支持。

## 风险与缓解

### button 替换 div 可能影响 CSS

保留原 class，并在样式里重置 button 默认外观，例如 border/background/font inherit。组件测试和视觉 smoke 确认样式不明显偏移。

### sandbox 默认值可能影响现有 iframe 页面

默认值保留常见能力并允许用户通过 prop 覆盖。文档提示如果页面被 sandbox 影响，可显式传空字符串或自定义策略。

### ESM-only 可能影响旧消费者

这是明确决策。发布说明需要写明：不再支持 `require('vue-stack-tabs')`，请使用 ESM import。

### Nuxt dist module 构建可能需要额外构建配置

通过独立构建入口或 rollup 多入口生成 `dist/nuxt/module.mjs`。packaged smoke test 防止再次回退到源码 TS。

## 实施顺序

1. 发布/API 测试与配置调整。
2. iframe bridge 测试与实现。
3. 可访问性组件测试与实现。
4. iframe props、load state、slot 测试与实现。
5. packaged smoke test 与文档更新。
6. 全量验证：lint、type-check、test、lib build、packaged smoke。
