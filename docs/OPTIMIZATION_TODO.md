# 可进一步优化的点

本文档记录后续可考虑的代码优化方向，供日后迭代时参考。

## 1. useTabActions - openTab 逻辑 ✅ 已优化

**文件**: `src/lib/hooks/useTabActions.ts`

**现状**: `openTab` 在 `renew` 分支中会执行 `navigateToTab` 和 `resolve`，与 `!renew` 分支有重复的 `navigateToTab` 调用，逻辑可拆分得更清晰。

**已实施**: 提取 `prepareTabInfo(tab)` 方法，合并默认值并统一 id 生成；重组 openTab 内部分支顺序，使 early return 更清晰。

---

## 2. useTabPanel - tabs.value.slice() workaround（需保留）

**文件**: `src/lib/hooks/useTabPanel.tsx`

**现状**: 在 `active()` 中通过 `tabs.value = tabs.value.slice()` 强制触发 Vue 响应式更新。

**说明**: 曾尝试移除，但若移除会导致 TabHeader 高亮异常且 iframe 进入动画 timing 变快，故需保留。

---

## 3. iframe 相关 ref 的更新方式 ✅ 已优化

**文件**: `src/lib/StackTabs.vue`

**现状**: `iframeEverActivated`、`iframeLoadingStates`、`iframeHasLoaded` 等使用 `{ ...obj, [id]: value }` 方式更新，在 iframe 数量多时会产生较多对象拷贝。

**已实施**: 改为 `reactive<Record<string, ...>>`，直接对属性赋值，减少不必要的对象拷贝。`iframeElRefs` 一并改为 reactive。

---

## 4. TabHeaderScroll - ResizeObserver 重复逻辑 ✅ 已优化

**文件**: `src/lib/components/TabHeader/TabHeaderScroll.vue`

**现状**: `scrollContainerResizeObserver` 和 `tabListResizeObserver` 的回调中存在相似的「将激活 tab 滚动到可视区域」逻辑。

**已实施**: 提取为 `ensureActiveTabInView()` 方法，在两个 observer 回调中复用。

---

## 5. useTabPanel - updatePageState 职责 ✅ 已优化

**文件**: `src/lib/hooks/useTabPanel.tsx`

**现状**: `updatePageState` 同时负责解析路由、查找/创建 tab、更新 active 状态、添加 page 等，职责较多。

**已实施**: 拆分为 `parseTabInfoFromRoute(route)`、`findOrCreateTargetTab(tabInfo, route, cacheName, page)`，`updatePageState` 主流程更简洁，便于单测和维护。

---

## 6. evict.ts — addCache/removeCache 线性扫描优化 ✅ 已优化

**文件**: `src/lib/hooks/tabPanel/evict.ts`

**现状**: `addCache` 和 `removeCache` 原先使用数组展开操作（`[...caches, id]`），在缓存数量多时产生频繁的数组拷贝。

**已实施**: 改为线性扫描 + 逐项重建数组，减少不必要的数组拷贝开销。

---

## 7. 近期性能优化汇总（2026-07）

以下优化在 2026 年 7 月的多次提交中完成（d482f39, 7799cfa, be523a0, 23061af, fb76cee）：

- evict.ts 中 addCache/removeCache 改为线性扫描 + 逐项重建
- 整体性能调优与代码精简

---

## 8. 后续轮次优化（2026-XX 五轮重构）

第三至五轮在原文档基础上补做以下优化（详见 `docs/DIAGNOSTIC_REPORT.md`）：

### 第三轮（性能 / 可维护性）

| 项目                                                                   | 文件                                                             | 状态 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- | ---- |
| `getMaxZIndex` 加 100ms TTL 缓存 + `invalidateZIndexCache` 导出        | `src/lib/utils/scrollUtils.ts`                                   | ✅   |
| 抽出共享 `EmptyPlaceholderComponent`（消除两份等价副本）               | `src/lib/components/StackKeepAlive/emptyPlaceholder.tsx`（新增） | ✅   |
| `saveScroller` 用 MutationObserver 缓存 `[data-stack-tab-scroll]` 列表 | `src/lib/hooks/tabPanel/scroll.ts`                               | ✅   |
| `Stack.readonlyList` 改为返回浅拷贝                                    | `src/lib/model/TabModel.ts`                                      | ✅   |
| `Stack` 新增 `find/findIndex/filter/some/forEachTopDown` 便捷方法      | `src/lib/model/TabModel.ts`                                      | ✅   |
| `versionLogger` 在 Vitest 等环境无版本号时显示 `vdev` 兜底             | `src/lib/versionLogger.ts`                                       | ✅   |

### 第四轮（Nuxt 集成 / SSR / 缓存失效）

| 项目                                                                | 文件                                                          | 状态 |
| ------------------------------------------------------------------- | ------------------------------------------------------------- | ---- |
| `session` 模块 SSR 环境 `typeof window` 守卫（隐私模式 + Nuxt SSR） | `src/lib/hooks/tabPanel/session.ts` + `useTabPanel.tsx`       | ✅   |
| Nuxt 模块用 `addComponent` 自动注册 `VueStackTabs` 全局组件         | `src/lib/nuxt/module.ts`                                      | ✅   |
| Nuxt plugin 显式调用 `applyStackTabsLocale(changeLocale, locale)`   | `src/lib/nuxt/runtime/plugin*.ts`                             | ✅   |
| `iframePath` prop 必填校验（开发期抛 Error）                        | `src/lib/StackTabs.vue`                                       | ✅   |
| 三个调用点主动 `invalidateZIndexCache` 让 z-index 重算              | `StackTabs.vue` / `ContextMenu/index.vue` / `PageLoading.vue` | ✅   |
| `iframeBridge.onRefreshRequest` 加 origin 校验安全文档              | `src/lib/utils/iframeBridge.ts`                               | ✅   |

### 第五轮（收尾）

| 项目                                                   | 文件                                                | 状态 |
| ------------------------------------------------------ | --------------------------------------------------- | ---- |
| `useContextMenu` 加 `BUBBLE_GUARD_MS=250ms` 时间戳守卫 | `src/lib/hooks/useContextMenu.ts`                   | ✅   |
| defu 全量审计：UUID 求值时机 + backward `__tab` 顺序   | `src/lib/hooks/useTabPanel.tsx` + `useTabRouter.ts` | ✅   |

---

## 9. 已知未优化 / 不优化

- **`Stack.toJSON` / `toString` 行为**：与 JSON.stringify 配合正常，是有意行为。
- **`i18n.mergeLocaleMessages` `__proto__` 黑名单**：`Object.entries` 已天然不枚举 `__proto__`，黑名单是冗余防御但可保留作注释。
- **`Stack.find/findIndex` 等只读方法重复声明**：库内部仍允许调用方根据习惯选择 `readonlyList().find(...)`，不强制迁移。

---

## 10. 2026-10 复查：待优化清单

以下为最近一次代码走查整理的优化项，按优先级排序。标注「已实测」的条目通过临时 Vitest 用例复现，临时文件已删除，未改动现有测试与源码。

> **2026-10-21 更新**：10.1–10.20 已完成（10.18 的 CI 体积阈值因仓库暂无 CI 配置未做）；P3 除「事件总线承担控制流」保留外均已完成。

### 优先级索引

| 优先级 | 问题                                                     | 位置                                                         | 状态                          |
| ------ | -------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| P0     | 刷新激活标签持续累积 keep-alive 实例（内存泄漏，已实测） | `StackKeepAlive.vue` / `tabPanel/refresh.ts`                 | ✅ 已完成                     |
| P0     | 同 path 不同 query 不更新页面栈记录（已实测）            | `useTabPanel.tsx`                                            | ✅ 已完成                     |
| P0     | `forward` 的 `__tab` 仍可被业务 query 覆盖               | `useTabRouter.ts`                                            | ✅ 已完成                     |
| P0     | 动态标签标题没有可靠写入口                               | `tabStore.ts` / `useTabPanel.tsx` / `tabInfoEncoder.ts`      | ✅ 已完成                     |
| P0     | `crypto.randomUUID()` 在非安全上下文抛错                 | `tabInfoEncoder.ts` / `useTabActions.ts` / `useTabPanel.tsx` | ✅ 已完成                     |
| P1     | `parseUrl` 不拆分 hash                                   | `utils/urlParser.ts`                                         | ✅ 已完成                     |
| P1     | 旧版 `__tab` 解码过于宽松，可伪造标签 id                 | `utils/tabInfoEncoder.ts`                                    | ✅ 已完成                     |
| P1     | `isCrossOriginUrl` 误判协议相对 URL                      | `utils/urlParser.ts`                                         | ✅ 已完成                     |
| P1     | 尾斜杠导致同一页面重复入栈                               | `useTabPanel.tsx`                                            | ✅ 已完成                     |
| P1     | 组件 props 只有初始化时生效                              | `StackTabs.vue`                                              | ✅ 已完成                     |
| P1     | `initialize` 不防重入                                    | `useTabPanel.tsx`                                            | ✅ 已完成                     |
| P2     | `useTabPanel` 被高频调用，每次重建子模块                 | `useTabPanel.tsx`                                            | ✅ 已完成                     |
| P2     | `syncTabsView` 每次写操作都替换整个 `tabs` 数组          | `tabPanel/tabStore.ts`                                       | ✅ 已完成                     |
| P2     | `findTabByTopPagePath` 实际是 O(n²)                      | `tabPanel/tabStore.ts`                                       | ✅ 已完成                     |
| P2     | `ContextMenu` 在模板中调用 `menuZIndex()`                | `ContextMenu/index.vue`                                      | ✅ 已完成                     |
| P2     | `tabs` 深度代理 `PageStackView` 类实例                   | `tabPanel/tabStore.ts` / `tabPanel/state.ts`                 | ✅ 已完成                     |
| P2     | `useIframeManager` 的 watch 每次 tabs 变化都触发         | `useIframeManager.ts`                                        | ✅ 已完成                     |
| P2     | 未使用依赖 / 运行时依赖被内联进 bundle                   | `package.json` / `vite.config.lib.ts`                        | ✅ 已完成                     |
| P2     | `encodeBase64` 使用废弃 API 且非 URL-safe                | `utils/tabInfoEncoder.ts`                                    | ✅ 已完成                     |
| P2     | Session 只保存激活标签                                   | `tabPanel/session.ts`                                        | ✅ 已完成                     |
| P3     | 事件总线承担控制流、类型断言、右键菜单边界等             | 见下文                                                       | ✅ 已完成（事件总线重构保留） |

### P0 — 正确性 / 内存

#### 10.1 刷新激活标签持续累积 keep-alive 实例 ✅

**状态**：已完成。外层 keep-alive key 保持稳定，刷新版本由内部 `PageShell` + `Transition` 承接：页面重建时播放原有转场，旧实例正常卸载，包装层与滚动位置保留；新增实例计数回归测试（created=4 / unmounted=3）。

**文件**：`src/lib/components/StackKeepAlive/StackKeepAlive.vue:46-52`、`src/lib/hooks/tabPanel/refresh.ts:61-66`

**现状**：激活标签刷新时只递增 `refreshVersion`，外层 `<component>` 的 `:key` 由 `activeCacheKey` 与 `activePageRefreshVersion` 拼接而成，key 变化但包装组件的 `name`（即 `cacheName`）不变，`keep-alive :include="caches"` 仍匹配该 name。Vue 的 keep-alive 以 vnode key 作为缓存键，旧 key 的实例会留在缓存中，且不会被 `include` prune。

**实测**：连续刷新激活标签 3 次，页面组件 `created = 4`、`unmounted = 0`；只有关闭标签时才会清理。

**建议**：不要在外层 keep-alive 上换 key。保持包装组件实例稳定，把 `refreshVersion` 传给内部页面 vnode，在 `pageComponentFactory` 的 `cloneVNode` 上加内部 key，让重建发生在包装组件内部；或刷新时轮换 `cacheName` 并同步 `caches`。前者改动更小，也能保留滚动位置与包装层状态。修复后补一个实例计数回归测试。

#### 10.2 同 path 不同 query 不更新页面栈记录 ✅

**状态**：已完成。按确认的产品策略，同 path、不同 query 追加新 page；`updatePageState` 与 `backward` 统一按 path + 业务 query 匹配。

**文件**：`src/lib/hooks/useTabPanel.tsx:403-405`

**现状**：`updatePageState` 只比较 `top.path === path`，不比较也不更新 `query`。

```ts
if (top.path === path) {
  cacheName = top.id
}
```

**实测**：先访问 `/list?page=1`，再导航到 `/list?page=2`，页面栈仍只有 1 个 page，`page.query` 保持初始值（甚至只有 `__tab`）。

**影响**：`backward('/list?page=1')` 按 query 匹配历史时找不到；`forward` 的判重逻辑与 `updatePageState` 不一致；会话恢复后页面栈记录的 query 与实际 URL 不符。

**建议**：抽出 `isSamePageLocation()`，与 `useTabRouter` 的 `isSameQueryIgnoringReserved` 复用。同 path、query 不同时至少更新栈顶 `page.query`；如果产品语义要求每次 query 变化都入栈，则 append 新 page。需要先明确「复用还是入栈」的产品策略。

#### 10.3 `forward` 的 `__tab` 仍可被业务 query 覆盖 ✅

**状态**：已完成。`forward` / `backward` 先移除保留参数，再强制写入当前标签的 `__tab`；新增归属回归测试。

**文件**：`src/lib/hooks/useTabRouter.ts:102`

**现状**：

```ts
const query = defu(to.query, { __tab: tabInfo })
```

`defu(obj, defaults)` 保留 `obj` 已有值，所以 `to.query.__tab` 仍会覆盖 `tabInfo`。`docs/DIAGNOSTIC_REPORT.md` 的 #55 标注已修复，但当前实现的语义并未改变。业务代码若传入 `query: { __tab: 'other-tab' }`，forward 会跳到另一个标签。

**建议**：

```ts
const query = { ...omitStackTabsReservedQuery(to.query), __tab: tabInfo }
```

补一个「业务 query 含 `__tab` 时仍归属当前标签」的回归测试。

#### 10.4 动态标签标题没有可靠写入口 ✅

**状态**：已完成。新增 `useTabActions().updateTabTitle(id, title)`，同步 TabRecord、视图、session 与激活标签 URL 中的 `__tab`。

**文件**：`src/lib/hooks/tabPanel/tabStore.ts:522-540`、`src/lib/hooks/useTabPanel.tsx:236-243`、`src/lib/utils/tabInfoEncoder.ts:70-80`

**现状**：`src/views/test_cases/DynamicTitle.vue` 直接修改 `currentTab.title`，但下一次 `syncTabsView()` 会用 `TabRecord.title` 覆盖 view：

```ts
view.title = record.title
```

切换标签、入栈、刷新等任意操作都可能把标题改回去。同时 `__tab` 编码的是旧 title，刷新或分享链接后标题也会回退。

**建议**：提供 `updateTabTitle(tabId, title)`，更新 `TabRecord`、`syncTabsView` 并触发 session 保存；或明确文档化 `title` 只读、动态标题通过路由 meta 派生。`__tab` 建议只编码 id/flags，不再把 title 当作身份数据。

#### 10.5 `crypto.randomUUID()` 在非安全上下文抛错 ✅

**状态**：已完成。新增 `createId()`：优先 `randomUUID`，回退 `getRandomValues`，最后 `Math.random`；补充缺失场景单测。

**文件**：`src/lib/utils/tabInfoEncoder.ts:105`、`src/lib/hooks/useTabActions.ts:64`、`src/lib/hooks/useTabPanel.tsx:141,324`

**现状**：`crypto.randomUUID` 仅在 secure context（https / localhost）可用。内网 `http://192.168.x.x` 部署时，`initialize`、`openTab`、兜底标签创建都会抛 `TypeError`，组件无法使用。

**建议**：统一封装 `createId()`，优先 `globalThis.crypto?.randomUUID?.()`，否则用 `Math.random()` / 时间戳生成 UUID 格式的 fallback，并补一个「`crypto.randomUUID` 不存在」的单测。

### P1 — 兼容性 / 行为一致性

#### 10.6 `parseUrl` 不拆分 hash ✅

**状态**：已完成。`parseUrl` 返回 `hash` 并从 query 中剥离，`navigateToTab` 将 hash 透传给 `router.push`。

**文件**：`src/lib/utils/urlParser.ts:89-106`

`/page?x=1#section` 会被解析为 `query.x = '1#section'`，hash 丢失且污染 query。`openTab`、`initialize`、`backward` 都受影响。

**建议**：先剥离 `#`，返回值增加可选的 `hash`；`navigateToTab` 把 hash 传给 `router.push`。

#### 10.7 旧版 `__tab` 解码过于宽松 ✅

**状态**：已完成。legacy 分支严格校验字段数量、id 长度与控制字符、Y/N 标记及刷新模式，非法值返回默认信息。

**文件**：`src/lib/utils/tabInfoEncoder.ts:57-68,96`

**现状**：只要解码结果不以 `{` 开头就进入 `decodeLegacyTabInfo`。任意字符串（如 `?__tab=invalid`）都会被解析为 `id = 'invalid'`、`title = ''`，从而创建任意 id 的标签。现有测试只断言「id 非空」，未覆盖该行为。

**建议**：legacy 分支要求 `split('|').length >= 5` 且字段格式合法；不满足时返回 `DEFAULT_TAB_INFO`。也可以给 legacy 增加显式版本前缀。

#### 10.8 `isCrossOriginUrl` 误判协议相对 URL ✅

**状态**：已完成。统一用 `new URL(url, origin)` 比较 origin，协议相对 URL 正确判为跨域；补回归测试。

**文件**：`src/lib/utils/urlParser.ts:74-83`

`/^https?:\/\//` 不匹配 `//host`，直接返回 `false`；但 `//host` 实际是跨域，`isAllowedTabUrl` 也允许它。结果 iframe 标签默认使用 `postMessage` 刷新模式，跨域页面通常收不到刷新指令。

**建议**：统一用 `new URL(url, origin)` 比较 `origin`；仅对相对路径、`about:blank` 返回同源。

#### 10.9 尾斜杠导致同一页面重复入栈 ✅

**状态**：已完成。新增 `normalizePathname`，`initialize` 写入与 `updatePageState` / `forward` / `backward` 比较统一使用规范化 path。

**文件**：`src/lib/hooks/useTabPanel.tsx:393-405,449-455`

比较时使用 `normalizePathForCache(route)`（会去掉尾斜杠），但写入 `page.path` 时使用原始 `route.path`。首次访问 `/list/`、下一次访问 `/list` 时，`top.path` 与 normalized path 不相等，会新建 page。

**建议**：写入 `page.path` 时也使用 normalized path；`initialize` 的 `parseUrl` 结果同样规范化。补一个尾斜杠往返测试。

#### 10.10 组件 props 只有初始化时生效 ✅

**状态**：已完成。`max` / `globalScroll` / `sessionPrefix` / `i18n` 增加 watch 同步；`defaultTabs` 在文档中明确「仅初始化生效」。

**文件**：`src/lib/StackTabs.vue:169-174`

`:max`、`:global-scroll`、`:session-prefix`、`:i18n` 在 setup 时写入 runtime context，之后变化不会同步。`:default-tabs` 也不会响应。

**建议**：对 `max` / `globalScroll` / `sessionPrefix` / `i18n` 加 `watch` 同步；`defaultTabs` 在文档中明确「仅初始化生效」。

#### 10.11 `initialize` 不防重入 ✅

**状态**：已完成。`isInitialized` 作为守卫，重复调用直接忽略并输出开发期警告。

**文件**：`src/lib/hooks/useTabPanel.tsx:196-218`

**现状**：`defaultTabs.value = [...defaultTabs.value, ...newDefaults]` 会累加，重复调用 `initialize` 会重复注册标签。`isInitialized` 只被写入，没有用于守卫。

**建议**：`if (isInitialized.value) return`，或显式要求先 `destroy()` / `reset()`。

### P2 — 性能 / 工程化

#### 10.12 `useTabPanel` 被高频调用 ✅

**状态**：已完成。以 `StackTabsRuntimeContext` 为 key 用 `WeakMap` 缓存 panel API，首次调用仍完成 `useRouter` / `useI18n` 注入。

**文件**：`src/lib/hooks/useTabPanel.tsx:58-115`

`StackTabs`、`StackKeepAlive`、`StackCacheRenderer`、每个缓存页面的 `useTabRouter`、`ContextMenu`、`useTabActions` 都会调用 `useTabPanel()`，每次都执行 `createTabPanelScroll` / `createTabPanelSession` / `createTabPanelRefresh`，产生新闭包与局部状态。

**建议**：以 `StackTabsRuntimeContext` 为 key 用 `WeakMap` 缓存 panel API；首次调用仍需在 setup 上下文中获取 `useRouter` / `useI18n`。

#### 10.13 `syncTabsView` 每次写操作都替换整个 `tabs` 数组 ✅

**状态**：已完成。`updatePage` 仅在页面 id 变化时重建 `tabs`；`refreshAllTabs` 通过 `updatePages` 批量合并为一次同步。

**文件**：`src/lib/hooks/tabPanel/tabStore.ts:543-550`

`appendPage`、`activateTab`、`updatePage`（刷新版本）都会重建 `tabs.value`，导致 TabHeader 的 `v-for`、iframe watcher、`activePageRefreshVersion` 等全部重新求值。刷新一个标签会 diff 整个标签栏。

**建议**：刷新版本使用独立的细粒度 `ref`；批量操作（`refreshAllTabs`）合并为一次 `syncTabsView`。

#### 10.14 `findTabByTopPagePath` 实际是 O(n²) ✅

**状态**：已完成。改为直接遍历 `tabViews`，降为 O(n)；`getTab` 保持读取 `tabs.value` 以维持对象身份语义。

**文件**：`src/lib/hooks/tabPanel/tabStore.ts:239-244,216-218`

外层遍历 `tabOrder`，`getTopPage` 一次，`getTab` 又执行 `tabs.value.find` 一次。每次路由解析都会调用。

**建议**：`getTab` 改为 `tabViews` Map 查询（配合 `markRaw` / `shallowReactive` 保持响应式），或 `findTabByTopPagePath` 直接遍历 record。

#### 10.15 `ContextMenu` 在模板中调用 `menuZIndex()` ✅

**状态**：已完成。z-index 在 `onMounted` 计算一次存入 ref；同一次挂载内不再重复扫描 DOM。

**文件**：`src/lib/components/ContextMenu/index.vue:16,121-124`

```vue
:style="{ ..., 'z-index': menuZIndex() }"
```

每次菜单 re-render 都会 `invalidateZIndexCache` + `getMaxZIndex('.stack-tab,.stack-tab *')`，即强制 `querySelectorAll` + `getComputedStyle` 遍历整个组件树（包含所有页面内容）。`PageLoading` 有类似写法，但只在显示时执行，影响较小。

**建议**：`onMounted` 计算一次存 `ref`；菜单打开期间层叠关系不会变，无需重复扫描。

#### 10.16 `tabs` 深度代理 `PageStackView` 类实例 ✅

**状态**：已完成。`pages` 使用 `markRaw(new PageStackView(...))`，读写仍转发 store。

**文件**：`src/lib/hooks/tabPanel/tabStore.ts:507-520`、`src/lib/hooks/tabPanel/state.ts:36`

`ref<ITabItem[]>` 会深度代理每个 view，包括 `pages` 类实例、`access` 对象和空的 `items` 数组。标签/页面多时，依赖追踪和内存开销都会增加。

**建议**：`pages: markRaw(new PageStackView(...))`，页面栈变化继续通过 `tabs.value` 替换或显式信号通知；或用 `shallowReactive` view。

#### 10.17 `useIframeManager` 的 watch 每次 tabs 变化都触发 ✅

**状态**：已完成。watch 改为 `id:active` 拼接的稳定签名，普通标签变化不再触发 iframe 遍历。

**文件**：`src/lib/hooks/useIframeManager.ts:141-169`

```ts
watch(() => iframeTabs.value.map((frame) => ({ id: frame.id, active: frame.active })), ...)
```

每次返回新数组，普通标签的任意变化（标题、页面入栈、刷新）都会执行回调并遍历 iframe。建议 watch 一个稳定签名（如 `id:active` 拼接字符串），或手动比较前后值。

#### 10.18 未使用依赖 / 运行时依赖被内联进 bundle ✅

**状态**：已完成。`defu` / `mitt` / `vue-i18n-lite` 设为 `external` 并保留在 `dependencies`；移除 `throttle-debounce` 及其类型依赖并同步 lockfile。`nostics`（vue-router 开发期依赖）与 `@floating-ui/*`、`@popperjs/core`（element-plus 预构建依赖）保留在 devDependencies，否则 Vite dev server 无法解析间接依赖。打包验证脚本已适配 external 依赖。CI 体积阈值未添加（已新增 `.github/workflows/ci.yml` 质量门禁，但未设置包体积阈值）。

**文件**：`package.json`、`vite.config.lib.ts:36-46`

- `nostics`、`throttle-debounce` 在 `src/` 和 `test/` 中零引用，建议移除。
- `@floating-ui/*`、`@popperjs/core` 等 devDependencies 未在库源码中使用，建议清理或移到演示/文档工程。
- `dist/vue-stack-tabs.es.js` 只 import `vue` / `vue-router`，说明 `defu`、`mitt`、`vue-i18n-lite` 被内联进 61KB bundle，但它们又列在 `dependencies`。建议将运行时依赖设为 `external`，或移到 `devDependencies` 并 external，避免安装体积与多份副本。
- 建议在 CI 增加 bundle 体积阈值。

#### 10.19 `encodeBase64` 使用废弃 API 且非 URL-safe ✅

**状态**：已完成。改用 `TextEncoder` + Base64URL，解码兼容旧 Base64；编码前截断超长 title；按 minor 发布。

**文件**：`src/lib/utils/tabInfoEncoder.ts:27-30,70-103`

- `escape` / `unescape` 属于 Annex B，未来可能被移除；
- base64 的 `+` / `/` / `=` 在 URL 中容易被外部工具误处理；
- `encodeTabInfo` 没有输出长度上限，超长 title 会让 `decodeTabInfo` 直接返回默认值（id 丢失），最终新建「未命名」兜底标签。

**建议**：改用 `TextEncoder` + base64url；`decode` 兼容旧 base64；编码前截断 title 或只编码 id/flags。

#### 10.20 Session 只保存激活标签 ✅

**状态**：已完成。统一文档口径为「恢复上次激活的标签及其页面栈」；完整会话恢复未实现（属于产品范围决策）。

**文件**：`src/lib/hooks/tabPanel/session.ts:75-81`

`saveActiveTabToSession` 只存一个 tab，刷新后其他标签丢失。README 的「恢复上次激活的标签」是准确的，但 `docs/zh/demo.md` 中「之前打开的标签会恢复」容易被理解为完整恢复。

**建议**：先统一文档口径。若需要完整会话恢复，保存 tabs 快照（含 pages），并处理 sessionStorage 容量与脏数据校验。

### P3 — 可维护性 / 体验

- **事件总线承担控制流（保留）**：`TabHeaderItem` 订阅 `TAB_ACTIVE`，`removeTab` / `findOrCreateTargetTab` emit 后由 item 触发 `handleActivate`（`TabHeaderItem.vue:86-94`、`useTabPanel.tsx:551-570`）。`removeTab` 已经返回 `nextActiveId`，上层可以直接 `active(nextActiveId)`，比事件链更易追踪。
- **类型断言与运行时防护 ✅**：已去除 `as unknown as ITabItem`，`updatePage` 增加目标 id 冲突防护。原问题：`findOrCreateTargetTab` 直接构造对象并断言（`useTabPanel.tsx:347-357`），缺少重复 page id、空栈、`updatePage` 改 id 冲突的防护。
- **`TabHeaderScroll` ✅**：已修复溢出判断（`if (hasScroller.value)`），卸载时调用 `handleScrollbarDragEnd()` 清理 document 事件。原问题：`tabListResizeObserver` 中 `if (!hasScroller.value) ensureActiveTabInView()` 逻辑疑似反了（`TabHeaderScroll.vue:231-234`），内容溢出时反而不会在标签增删后纠正滚动位置；拖拽中卸载组件时没有移除 document 上的 `mousemove` / `mouseup`（`:240-245`）。
- **`ContextMenu` 只修正右边界，不修正下边界 ✅**：`onMounted` 已同时修正右/下边界。原问题（`ContextMenu/index.vue:208-214`），菜单在视口底部会溢出。
- **iframe 安全默认值 ✅**：文档已补充「默认包含 `allow-same-origin`，同源页面应移除」的说明。默认 `allow-scripts allow-same-origin`（`StackTabs.vue:96`）对同源 iframe 可逃逸 sandbox；建议文档明确「仅用于跨域第三方页面」，或拆分默认值。
- **测试缺口 ✅**：四类回归测试已补齐：
  1. 刷新激活标签后 keep-alive 实例数量；
  2. 同 path 不同 query 的页面栈行为；
  3. 业务 query 含 `__tab` 时 forward 的归属；
  4. `crypto.randomUUID` 不存在时的 fallback。

### 建议落地顺序

1. **10.1**（keep-alive 实例累积）+ 回归测试；这是唯一会随使用时间持续恶化的问题。
2. **10.2 / 10.3**（页面栈 query 同步、`__tab` 强制归属）+ 回归测试；影响栈式导航的正确性。
3. **10.4 / 10.5**（标题写入口、UUID fallback）；API 完整性与部署兼容性。
4. **10.6 ~ 10.9**（hash、legacy `__tab`、协议相对 URL、尾斜杠）；都是小而明确的修复。
5. **10.13 / 10.15 / 10.18**（tabs 全量替换、z-index 扫描、依赖清理）；低风险、收益直接。

> 以上 1–5 已于 2026-10-21 完成。验证结果：`type-check`、251 个单测、ESLint（0 error）、`lib:build`、`verify-packaged` 全部通过。

---

## 11. 2026-10-22 第二轮复查（渲染耦合 / Nuxt 产物 / 一致性）

> 复查方式：通读 `src/lib` 全部源码 + 静态调用链分析；关键结论用临时 Vitest 探针（node / happy-dom）实测，探针文件已删除，**本轮未改动任何源码**。
> 基线：`pnpm run test` 257 passed、`pnpm run type-check` 通过、`pnpm run lib:build` 通过。
> 产物：`vue-stack-tabs.es.js` 64.96 kB（gzip 21.87 kB）、`style.css` 46.47 kB（gzip 7.07 kB）。

### 11.1 结论

第五轮之后已经没有“结构性”性能问题，剩余空间集中在四类：

1. **渲染耦合**：页面栈写入仍会全量重建 `tabs` 数组（10.13 只覆盖了 `updatePage` / `refreshAllTabs`，`appendPage` / `popPages` / `replacePages` / `clearPages` / `consumeBackParams` 仍会同步整个标签栏）。
2. **打包产物**：`vite.config.nuxt.ts` 未 external `vue` / `vue-i18n-lite`，Nuxt 插件被打成 50 kB（含 Vue 运行时）；`addComponent.filePath` 指向不存在的 `dist/index.ts`。
3. **重复编解码**：每次激活标签都执行一次 `encodeTabInfo`（≈1.94 µs），结果通常被 `defu` 丢弃；每次路由解析都 `decodeTabInfo`（≈0.96 µs）。
4. **一致性 / 清理**：若干 props 动态更新缺口、未捕获的 `router.replace`、未使用导出与状态等。

### 11.2 实测数据（临时探针，非基准测试）

| 探针                                | 现状                       | 建议方案后              | 备注                                             |
| ----------------------------------- | -------------------------- | ----------------------- | ------------------------------------------------ |
| 同一标签连续前进 2 次（挂载组件）   | `tabs` 数组被替换 **4 次** | **0 次**（已验证）      | 每次 `appendPage` + `activateTab` 各触发一次     |
| `appendPage` ×200（20 标签 ×10 页） | 4.9 ms                     | 1.2 ms（已验证）        | 移除页面栈写入里的 `syncTabsView()`              |
| `PageStackView.at(9)` ×100k         | 1.64 µs/次                 | 0.53 µs/次（已验证）    | 每次 `at()` 都重建整个页面数组                   |
| `PageStackView.size()` ×100k        | 1.60 µs/次                 | 0.19 µs/次（已验证）    | 同上                                             |
| `isSameQueryIgnoringReserved` ×200k | 0.30 µs/次                 | 0.16 µs/次（已验证）    | 同时修复 key 集合比较缺陷                        |
| `encodeTabInfo` ×100k               | 1.94 µs/次                 | 0（复用栈顶 `__tab`）   | 每次 `active()` 都编码，但 `defu` 优先保留已有值 |
| `decodeTabInfo` ×50k                | 0.96 µs/次                 | 可加单条 memo（收益小） | 同一 `__tab` 在一次会话中通常反复出现            |

测试环境：Vitest 4（node 环境跑 store / 纯函数探针，happy-dom 跑挂载探针），数字用于横向对比，不代表浏览器真实帧耗时。

### 11.3 P1 — 建议优先处理 ✅

#### 11.3.1 页面栈写入不应重建 `tabs` 数组（已验证 ✅）

**状态**：已完成（提交 `a9fdec1`）。新增 store 级与挂载级回归测试。

**文件**：`src/lib/hooks/tabPanel/tabStore.ts:419-463,511-518,312-316`

**现状**：`appendPage`、`popPages`、`replacePages`、`clearPages`、`consumeBackParams` 末尾都调用 `syncTabsView()`；`activateTab` 即使激活的已经是当前标签也会重建。一次标签内的前进/后退会产生 1–2 次全量 `tabs.value` 替换，使 `TabHeader` 的 `v-for`、`activePageRefreshVersion`、iframe computed 等全部重新求值。

**实测**：挂载 `StackTabs` 后做 2 次同标签前进，`tabs` 数组被替换 4 次；按下面方案改造后为 0 次，页面栈正确增长到 3 层，257 个既有单测 + `type-check` 全部通过。

**建议**：

```ts
// appendPage / popPages / replacePages / clearPages：只更新 pageIdsByTabId / pagesById，
// 不再调用 syncTabsView()。页面本身位于 reactive Map 中，消费方仍能收到更新。
// consumeBackParams：delete top._backParams 已是响应式写，同样不需要 syncTabsView()。

const activateTab = (id: string): ITabItem | null => {
  const nextId = tabsById.has(id) ? id : ''
  if (nextId !== activeTabId.value) {
    activeTabId.value = nextId
    syncTabsView()
  }
  return getTab(id)
}
```

**风险**：`tabs` 数组的**对象身份**不再随入栈变化。外部若用 `watch(tabs, …)` 观察页面栈（此前依赖数组替换触发），需要改为读取 `tab.pages` / store API；建议在 release notes 中注明。库内部无此依赖（已 grep 全部 `.pages` 调用点）。

#### 11.3.2 Nuxt 产物：插件内联 Vue 运行时，组件入口指向不存在的文件（高风险 ✅）

**状态**：已完成（提交 `d772309`）。插件体积 50,046 B → 468 B，`verify-packaged` 增加产物断言。

**文件**：`vite.config.nuxt.ts:16-30`、`src/lib/nuxt/module.ts:34-38`、`src/lib/nuxt/runtime/plugin.ts:19-22`

**现状（基于本次 `lib:build` 产物）**：

- `dist/nuxt/runtime/plugin.mjs` **50,046 B**，而源码只有约 25 行；文件中没有 `from "vue"`，却包含 `inject() can only be used inside setup` 字符串 → **Vue 运行时与 `vue-i18n-lite` 被内联**（external 列表只有 `nuxt/kit` / `vue-stack-tabs` / `#app` / `nuxt/app`）。
- `dist/nuxt/module.mjs` 中 `addComponent({ filePath: resolve('../index.ts') })` 编译后是 `o("../index.ts")`，即 `dist/index.ts`；但 `dist/` 下只有 `index.d.ts`，**没有 `index.ts`**。
- 内联的 `vue-i18n-lite` 会创建自己的 `Symbol('i18n')`，与库（external 后由使用方解析）的实例 key 不一致；`plugin.ts` 顶层的 `const { changeLocale } = useI18n()` 很可能拿到 `undefined`（且内联 Vue 的 `inject` 读不到 Nuxt app context），生产环境存在启动即抛错的风险。请以真实 Nuxt 应用冒烟确认。

**建议**：

```ts
// vite.config.nuxt.ts
external: ['nuxt/kit', 'nuxt/app', '#app', 'vue', 'vue-router', 'vue-i18n-lite', 'vue-stack-tabs']
```

```ts
// src/lib/nuxt/module.ts
addComponent({
  name: 'VueStackTabs',
  export: 'VueStackTabs',
  filePath: resolve('../vue-stack-tabs.es.js') // 指向真实构建产物
})
```

同时：插件内避免顶层 `useI18n()`（locale 已通过 plugin options 传入），或导出显式的 `setLocale`；在 `scripts/verify-packaged.mjs` 增加断言：`plugin.mjs` 不含 `inject() can only be used inside setup`、体积 < 5 kB、`module.mjs` 的 `filePath` 指向的文件存在。

### 11.4 P2 — 低风险一致性 / 健壮性 / 微性能 ✅

1. **`isSameQueryIgnoringReserved` 存在 key 集合比较缺陷 + 可提速**：`src/lib/utils/urlParser.ts:156-188`。旧实现只比较 key 数量再逐 key 取值，`{ a: '' }` 与 `{ b: '' }` 会被判为相等。改为“先统计非保留 key 数量 + 逐 key 用 `hasOwnProperty` 比较”，实测 0.30 µs → 0.16 µs；对相同 key 集合做了 20,000 组随机 fuzz，与旧实现语义完全一致。现有用例（数组 vs 逗号字符串）继续通过。
2. **`PageStackView.at/size/isEmpty` 每次重建数组**：`tabStore.ts:158-172`。给 `PageStackAccess` 增加 `getPageCount` / `getPageAt`（直接读 `pageIdsByTabId` + `pagesById`），实测 4–8 倍提速；`at(-1)` 仍保持数组下标语义（返回 `undefined`）。
3. **`PageLoading` 在模板里调用 `loadingZIndex()`**：`components/PageLoading.vue:14,25-31`。每次重渲染都会 `invalidateZIndexCache` + 全 DOM `querySelectorAll` + `getComputedStyle`。改为 `watch(isLoading)` 在显示时计算一次存入 ref（已验证单测通过）。
4. **`useIframeManager` 的 `refreshKeys` watch 使用 `deep: true`**：`useIframeManager.ts:179-192`。所有写入点都是“整对象替换”（`refresh.ts:51,128`、`useIframeManager.ts:115,172`、`useTabPanel.tsx:745`），去掉 deep 可避免每次刷新遍历所有 key。
5. **`updatePageState` 重复读取栈顶 + 不可达 throw**：`useTabPanel.tsx:445-447`。先 `getTopPage(targetTab.id)` 判空、随后再读一次并抛错；合并为一次读取。
6. **`routeKey` 重复拼接 `__tab`**：`useTabPanel.tsx:561`。`route.fullPath` 已包含完整 query（含 `__tab`）与 hash，`routeKey` 直接取 `route.fullPath` 即可，避免每次导航多分配一段长字符串。
7. **`active()` 每次激活都重新编码 `__tab`**：`useTabPanel.tsx:711-719`。`defu(top.query, { __tab })` 会优先保留栈顶已有的 `__tab`，新编码通常被丢弃。改为先克隆 `top.query`，仅当缺少有效 `__tab` 时再 `encodeTabInfo(toTabBase(target))`；顺带补上 `iframeRefreshMode`（当前内联对象漏传，reload 模式标签在兜底分支会被写成 postMessage）。
8. **`StackCacheRenderer` 向 slot 传递未被消费的响应式数据**：`StackCacheRenderer.vue:25-31,56-64`。`StackKeepAlive` 只解构 `wrappedComponent / activeCacheKey / component`，`refreshKey` 与 `activePageRefreshVersion` 是无效依赖，会让刷新/页面变化多触发一次 renderer 重渲染。
9. **`updatePageState` 中 `void router.replace(...)` 未 catch**：`useTabPanel.tsx:527-533`。路由守卫抛错时可能产生 unhandled rejection；与 `updateTabTitle` / `redirectToHome` 的 `.catch` 写法对齐。
10. **props 动态更新缺口**：`pageTransition` / `pageTransitionBack` 在 `StackTabs.vue:202-209` 被复制进 `pageSwitch` ref，之后修改不生效；`iframeLoadTimeout` 在 `StackTabs.vue:230-235` 被 `useIframeManager` 捕获一次，之后修改不生效。按 10.10 的模式补 `watch`，或文档明确“仅初始化生效”。
11. **`renew` 到当前地址时会 reject**：`useTabActions.ts:110-143`。`navigateToTab` 使用 `rejectFailureResult: true`，对已存在的激活标签 `openTab(tab, true)` 会因 vue-router 的重复导航 `NavigationFailure` 而 reject（实测），并触发 `renewTab` 回滚。语义上“续签当前标签”应算成功；建议对重复导航降级为 resolved，或先比较目标 URL。
12. **`default-tabs` 的 iframe 标签不工作**：`useTabPanel.tsx:141-182`。`buildTab` 只写 `__tab`，没有写 `__src` / `url`，也未设置 iframe 路由，实测 `<iframe src="about:blank">`。建议支持（复用 `openTab` 的 `__src` 逻辑）或在开发期给出明确警告并补充文档。
13. **`TabHeader` 生产环境仍会打印 warn**：`components/TabHeader/index.vue:362`，其他告警均有 `import.meta.env.PROD` 守卫。
14. **`decodeTabInfo` 可加单条 memo**：`utils/tabInfoEncoder.ts:133-153`。同一 `__tab` 在一次导航/会话中重复解码，缓存最后一次 `encoded → ITabBase` 可省掉 base64 + `TextDecoder` + `JSON.parse`；收益小，可按需做。
15. **`saveScroller` 对 auto key 做了两遍遍历**：`tabPanel/scroll.ts:109-135`。第一轮写入 `AUTO_SCROLLER_PREFIX` key，第二轮又把它们重新解析一遍；第二轮可只遍历非 auto selector。
16. **`markTabPagesForEviction` 双重数组拷贝**：`tabPanel/evict.ts:42-49`。`PageStackView.list()` 先 `getPages()` 再 `[...pages]`，只为取 id；可改用 `readonlyList()`，或让 store 侧直接用 `getPageIds()` 标记。

### 11.5 P3 — 清理与可维护性（部分完成）

- **未使用 / 仅测试引用 ✅**：已删除 `scrollUtils.getScrollbarWidth`、`invalidateAutoScrollCache`、`TabModel.DragData` / `ScrollEvents`、`urlParser.isInvalidIframeUrl`，`MAX_TAB_TITLE_LENGTH` 改为内部常量，只写不读的运行时 `defaultTabs` 状态一并移除。
- **`useTabPanel.tsx` 834 行（暂缓）**：拆分 `initialize` / `updatePageState` 需要把 store、session、scroll、事件依赖逐项注入，属于纯结构调整且行为风险高于收益；本轮保持现状，后续修改该文件时再增量拆分。
- **事件总线承担控制流（保留）**：`removeTab` 已返回 `nextActiveId`，上层可直接 `active(nextActiveId)`，比 `TAB_ACTIVE` 事件链更易追踪；为避免行为回归，本轮未改动（10.x P3 已记录）。
- **模板里的多余断言 ✅**：已移除 `TabHeader` 模板中的 `item as ITabItem` / `as unknown as ITabItem`，仅保留 `contextMenuData.item` 的必要断言。
- **`session` 写入去重 ✅**：`flushPendingWrite` 与上次成功写入的 JSON 比较，内容相同时跳过 `setItem`；恢复/清理时同步维护基线。
- **CI 质量门 ✅**：新增 `.github/workflows/ci.yml`（`type-check` / `test` / `lint:check` / `format:check` / `lib:build` / `verify-packaged`）；包体积阈值仍未设置，建议后续补充。

### 11.6 建议补充的回归测试 ✅

1. 页面栈写入（`appendPage` / `popPages` / `clearPages`）不改变 `tabs` 数组身份；
2. `activateTab` 重复激活同一标签不触发 `tabs` 重建；
3. `isSameQueryIgnoringReserved` 的 key 集合差异用例（`{ a: '' }` vs `{ b: '' }`）；
4. Nuxt 产物：`plugin.mjs` 不内联 Vue、`module.mjs` 的 `filePath` 真实存在（打包冒烟）；
5. `default-tabs` 中 iframe 标签的行为（支持或明确警告）；
6. `openTab(tab, true)` 在目标地址与当前地址相同时的行为。

### 11.7 落地建议（已按 1 → 4 顺序执行）

1. 先做 **11.3.1**（页面栈不重建 tabs）+ 回归测试：收益最直接、已验证、只影响渲染耦合。
2. 再做 **11.3.2**（Nuxt external + filePath + 冒烟断言）：影响 Nuxt 使用方，属于打包正确性问题。
3. 然后按 **11.4** 逐项清理；其中 1/2/3/4/7 都有已验证的小改动，1/2/7 还需补少量单测。
4. 最后处理 **11.5** 死代码与结构调整，避免一次性大改。

### 11.8 实施记录（2026-10-22）

- **11.3.1 / 11.3.2**：已完成。提交 `a9fdec1`（页面栈写入不重建 tabs）、`d772309`（Nuxt external / 组件入口 / 插件 inject）。
- **11.4**：16 项全部完成，提交 `1cc1388`；新增或更新用例覆盖 query 比较、`PageStackView` 访问、z-index、renew 同地址、默认 iframe 标签、解码缓存。
- **11.5**：死代码清理、模板断言、session 写入去重、CI 质量门已完成；`useTabPanel` 拆分与事件总线控制流按上述理由暂缓。
- **验证**：`pnpm run type-check`、`pnpm run test`（269 passed）、`pnpm run lint:check`（0 error）、`pnpm run lib:build`、`node scripts/verify-packaged.mjs`、`pnpm exec node scripts/verify-prepack.mjs` 全部通过。

> 注：本地 `pnpm run format:check` 会因未纳入版本控制的 `docs/articles/` 报错；所有已跟踪文件均通过 Prettier。
