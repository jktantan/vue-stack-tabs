# Changelog

## 2.6.1 (2026-10-24)

### 修复

- 页签切换（尤其是普通页签 → iframe 页签 → 切回）后内容区滚动位置回到顶部：keep-alive 停用会先把页面 DOM 移入隐藏容器，`onDeactivated` 读取到的 `scrollTop` 已归零。现在在滚动过程中实时记录主滚动容器的位置，停用时不再用归零值覆盖记录值。

## 2.6.0 (2026-10-24)

### 新增

- `<VueStackTabs>` 新增可选属性 `scrollContainer`：允许宿主用自己的滚动组件（如 Element Plus `ElScrollbar`）承载每个页签内容区的滚动。组件只需渲染默认插槽并 expose `scrollElement`，或实现 `StackTabsScrollAdapter` 的可选方法（`getPosition` / `setPosition` / `getMetrics` / `onScroll`）。
- 导出 `StackTabsScrollAdapter`、`StackTabsScrollElementInstance`、`StackTabsScrollMetrics`、`StackTabsScrollPosition` 类型。
- 自定义滚动容器下，滚动位置记忆与上下滚动阴影改为作用于真实滚动元素；每个页签仍保持独立滚动位置。
- 支持运行时切换 `scrollContainer`：只重新解析适配器并重新同步阴影/位置，不重建 keep-alive 缓存页。

### 行为变更

- 传入 `scrollContainer` 时缓存页 wrapper 恒为 `overflow: hidden`，`globalScroll` 只对默认路径生效。
- 未传 `scrollContainer` 时行为与 2.5.1 完全一致。

### 文档

- 中英文滚动文档新增「自定义滚动容器」章节，属性表新增 `scrollContainer`。

## 2.5.1 (2026-10-24)

### 修复

- 主题变量选择器改用 `:where()` 归零特异性：宿主普通 `:root` 覆盖即可同时压过浅色默认值与深色值，不再需要 `:root:root`；尺寸预设同样可被普通 `:root` 覆盖。

## 2.5.0 (2026-10-24)

### 新增

- `--stack-tab-loading-accent` 改为由主色派生，loading 圆环会跟随 `--stack-tab-accent` 换色。
- 新增页签头高度、右键菜单项高度/内边距令牌，以及 `data-stack-tab-size="small|normal|large"` 三档尺寸预设。
- 在线演示新增「尺寸」控制，可切换小/正常/大，并持久化选择。

### 修复

- 深色下右键菜单 hover 对比度不足：改用按下态主色作背景、浅色文字/图标，避免“亮底深字”看不清。

## 2.4.0 (2026-10-24)

### 新增

- 主题化：界面颜色与阴影抽为 `--stack-tab-*` CSS 变量，浅色默认值与旧版一致；内置深色主题，支持 `html.dark`、`html[data-theme="dark"]` 与局部 `[data-theme="dark"]`。
- 在线演示新增「外观」控制，可切换浅色/深色与蓝/绿/紫主色，并持久化选择。
- `useTabRouter()` 返回 `tabId` / `pageId`，可用于定位当前标签与缓存页；`pageId` 可配合 `getWrapper({ pageId })` 使用。

### 修复

- 深色主题下页签、菜单与内容区滚动阴影不可见：深色改用描边 + 主色光晕 + 顶部高光表达层次，inset 阴影加宽并统一由 `--stack-tab-shadow-color` 控制。
- 页面上下文（`tabId` / `pageId`）改为在缓存包装组件中 `provide`、页面 Hook 通过 `inject` 读取，不再作为 attrs 注入页面组件。多根节点（Fragment）页面不再出现 `Extraneous non-props attributes (tId, pId)` 警告，单根节点页面也不会再把内部 ID 透传到 DOM。

### 行为变更

- 页面组件不再通过 `attrs.tId` / `attrs.pId` 获得内部 ID；请使用 `useTabRouter().tabId` / `useTabRouter().pageId`。手动传入的 attrs / props 仍作为兼容回退读取。

### 工程

- `docs:dev` 端口调整为文档 `18081`、演示 `18080`，避开 Windows Hyper-V/WinNAT 的保留端口段。

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
