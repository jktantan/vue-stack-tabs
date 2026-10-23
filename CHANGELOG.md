# Changelog

## Unreleased

### 新增

- `useTabRouter()` 返回 `tabId` / `pageId`，可用于定位当前标签与缓存页；`pageId` 可配合 `getWrapper({ pageId })` 使用。

### 修复

- 页面上下文（`tabId` / `pageId`）改为在缓存包装组件中 `provide`、页面 Hook 通过 `inject` 读取，不再作为 attrs 注入页面组件。多根节点（Fragment）页面不再出现 `Extraneous non-props attributes (tId, pId)` 警告，单根节点页面也不会再把内部 ID 透传到 DOM。

### 行为变更

- 页面组件不再通过 `attrs.tId` / `attrs.pId` 获得内部 ID；请使用 `useTabRouter().tabId` / `useTabRouter().pageId`。手动传入的 attrs / props 仍作为兼容回退读取。

## 2.3.0 (2026-10-22)

### 新增

- `default-tabs` / `home-tab` 支持 `iframe: true`：按 `iframePath + __src` 承载，并自动推断 `iframeRefreshMode`。
- `pageTransition` / `pageTransitionBack` / `iframeLoadTimeout` 支持运行时动态更新。
- `openTab(tab, true)` 在目标地址与当前地址相同时返回成功（由 refreshKey 触发页面重建）。

### 性能

- 页面栈写入（`appendPage` / `popPages` / `replacePages` / `clearPages` / `consumeBackParams`）不再重建 `tabs` 数组；标签内导航不再触发整个标签栏重算。
- `PageStackView.at/size/isEmpty` 直接按页面 id 读取，不再构造整条页面数组。
- `PageLoading` 只在显示时计算 z-index；iframe `refreshKeys` 去掉 `deep` watch。
- query 比较改为逐键比较；`__tab` 解码增加单条缓存；`active()` 复用栈顶 `__tab`。

### 修复

- 多根节点（Fragment）页面刷新后内容空白：刷新动画改为在缓存 wrapper（真实元素）上执行离场/入场，保留动画且不额外包裹页面 DOM。
- 刷新动画期间不再隐藏 overflow，长页面刷新时 `clientWidth` 与 `scrollTop` 保持稳定。
- 滚动阴影类改挂到不参与 transform 的 keep-alive panel，避免 `::after` 包含块变化导致顶部阴影错位/消失；同时修复新标签页阴影不生效。
- Nuxt 插件 external 化 Vue / vue-i18n-lite（产物约 50 KB → 0.5 KB），修正 `addComponent.filePath` 指向真实入口；插件在 app 注入上下文中获取 i18n 实例。
- `isSameQueryIgnoringReserved` 修正 key 集合比较误判；`renew` 同地址导航不再 reject；`default-tabs` 的 iframe 标签不再渲染 `about:blank`。
- `updatePageState` 的 `router.replace` 增加异常捕获；`TabHeader` 生产环境告警增加守卫。

### 行为变更

- `tabs` 数组身份不再随页面入栈/出栈变化；需要监听页面栈时请读取 `tab.pages` 或 store API。
- `isSameQueryIgnoringReserved` 对 key 集合的判定更严格：不同 key 不再因为值都为空而被判为相等。

### 废弃

- `DragData` / `ScrollEvents` 标记为 `@deprecated`，仅为兼容 2.x 类型导出保留，将在下一个大版本移除。

### 工程

- 新增 CI（`type-check` / `test` / `lint` / `format` / `lib:build` / `verify-packaged`）。
- 清理未使用的内部导出与运行时状态；session 写入按内容去重。
