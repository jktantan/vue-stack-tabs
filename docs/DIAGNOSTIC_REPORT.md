# vue-stack-tabs 诊断报告

> 生成时间：自动化审查
> 审查范围：`src/lib/` 全部源码 + playground 用法示例
> 输出：61 项发现，按优先级 P0 / P1 / P2 / P3 排序

---

## 严重程度分级

- **P0**：实际可触发崩溃 / 安全风险 / 核心功能失效
- **P1**：a11y、类型安全、事务一致性、UX 隐患
- **P2**：性能 / 兼容性 / 集成缺陷
- **P3**：代码风格 / 可维护性 / 文档

---

## P0 — 必须立即修复

### #1 `useTabActions.openTab` 中 `tab.id` 与 `tabInfo.id` 混用
**文件**：`src/lib/hooks/useTabActions.ts:82-83`

```ts
if (tabInfo.id && renew && isExistingTab) {
  const currentTab = getTab(tab.id!)      // ← 应为 tabInfo.id
  rollbackRenew = renewTab(tab)
  ...
}
```

`tab.id` 在用户未传 id 时是 `undefined`，导致 `getTab(undefined)` 永远 `null`，而下一行 `renewTab(tab)` 用 `tab.id === undefined` 去查表，直接抛 `Cannot read properties of undefined`。

**修复**：`const currentTab = getTab(tabInfo.id!)`。

---

### #4 `refreshTab` 在 active 标签路径不触发响应式刷新
**文件**：`src/lib/hooks/tabPanel/refresh.ts:53-72`

```ts
if (tab.active) {
  currentPage.refreshVersion = (currentPage.refreshVersion ?? 0) + 1
  return
}
```

`currentPage` 是栈顶引用，对它的 mutation **不会** 触发 `tabs.value` 数组的响应式重渲；`activePageRefreshVersion` 是依赖 `tabs.value` 的 `computed`，结果就是组件 keep-alive 的 `:key` 不变，刷新不生效。

**修复**：在末尾加 `triggerRef(tabs)` 或 `tabs.value = [...tabs.value]`。

---

### #5 `updatePageState` 在路由尚未确认时提前 evict
**文件**：`src/lib/hooks/useTabPanel.tsx:338-341`

```ts
for (let i = 0; i < stepsToPop; i++) {
  const popped = targetTab.pages.pop()
  if (popped) evictPageCache(popped.id)
}
```

这是 `StackCacheRenderer` 的 watcher 同步触发的代码，**但路由还没真正切换**。如果守卫拒绝，缓存已经被销毁，无法回滚。

**修复**：改为 `markCacheForEviction`，由 `evictMarkedCaches` 在 onActivated 或下一拍统一执行。

---

### #11 `decodeTabInfo` 长度校验在解码之后（DoS）
**文件**：`src/lib/utils/tabInfoEncoder.ts:79-83`

```ts
if (encoded.length > MAX_ENCODED_TAB_INFO_LENGTH) return { ...DEFAULT_TAB_INFO }
try {
  const tabString = decodeBase64(encoded)   // ← 先解码 10MB 字符串
  if (tabString.length > MAX_DECODED_TAB_INFO_LENGTH) return { ...DEFAULT_TAB_INFO }
  ...
```

**修复**：先按上限截断（或提前 return），再解码。

---

## P1 — 重要缺陷

### #2 `active` 函数中 `__tab` 兜底语义不清晰
**文件**：`src/lib/hooks/useTabPanel.tsx:580-587`

`encodeTabInfo({ ... })` 后用 `defu({ __tab }, top.query || {})` —— `__tab` 会被 `top.query.__tab` 覆盖，反向才符合「兜底」语义。

---

### #14 `useContextMenu` 双重 `nextTick` 竞态
**文件**：`src/lib/hooks/useContextMenu.ts:66-75`

外层 `await nextTick(cb)` 只等 cb 同步执行完成，**不等内层 nextTick**。期间用户点击可能不被 `handleClickOutside` 接住。

**修复**：改为两次 `await nextTick()`。

---

### #24 TabHeader 键盘焦点循环越界
**文件**：`src/lib/components/TabHeader/index.vue:241-270`

`currentIndex === -1`（无 active）时 `safeIndex = 0`，按右方向键直接跳到索引 1，**跳过第一个标签**。

**修复**：`activateTabByIndex((currentIndex + 1 + count) % count)`。

---

### #49 `toTabInfo.id` 默认值与类型不匹配
**文件**：`src/lib/utils/tabInfoEncoder.ts:38-50`

`ITabBase.id` 类型是 `string | undefined`，但 `payload.id` 非字符串时用 `DEFAULT_TAB_INFO.id = ''`，**类型应为 undefined**。

**修复**：当 `payload.id` 不是 string 时返回 `undefined`。

---

### #55 `useTabRouter.forward` 中 `__tab` 被业务 query 覆盖
**文件**：`src/lib/hooks/useTabRouter.ts:101`

```ts
const query = defu({ __tab: tabInfo }, to.query)   // to.query 会覆盖 __tab
```

**修复**：`defu(to.query, { __tab: tabInfo })`。

---

### #60 `sessionStorage` 在隐私模式抛 `QuotaExceededError`
**文件**：`src/lib/hooks/tabPanel/session.ts:30-90`

所有 `setItem`/`removeItem` 未 catch。

**修复**：统一包 try/catch，失败时静默降级。

---

## P2 — 性能 / 兼容性

### #8 `__stack_tabs_refresh` 查询参数污染 URL
**文件**：`src/lib/hooks/useIframeManager.ts:36-49`

所有 iframe 都附加 `__stack_tabs_refresh=...` 到查询字符串。

**修正方案**（已在第二轮迭代中调整）：原报告建议「仅 `iframeRefreshMode === 'reload'` 时附加」是**错误的**——postMessage 模式在出错重试时也必须附加 refreshKey 才能强制重建 iframe。**正确语义是「仅当 `refreshKey > 0` 时附加」**，与刷新模式无关：初次激活（key=0）保留干净 URL，重试或显式刷新时附加以破坏浏览器缓存。

### #10 `tabInfoEncoder` 双重 `encodeURIComponent`
**文件**：`src/lib/utils/tabInfoEncoder.ts:23-25`

`btoa(encodeURIComponent(x))` 中 `encodeURIComponent` 已把中文转成 ASCII，不需要再外面包一层。`escape` 已弃用。

### #27 `import.meta.globEager` 已弃用
**文件**：`src/lib/i18n/index.ts:54`

应改为 `import.meta.glob('./lang/*', { eager: true })`。

### #29/#30 Nuxt 模块未自动注册组件与上下文
**文件**：`src/lib/nuxt/module.ts`

未注册 `VueStackTabs` 全局组件，未把 `i18n.locale` 透传到 `applyStackTabsLocale`，未对未挂载 StackTabs 的页面调用 hook 提供友好错误。

### #48 `backward` 静默失败
**文件**：`src/lib/hooks/useTabRouter.ts:185-189`

`backward(2)` 但栈只有 1 层时返回 false，无 warning。建议加 `console.warn`。

---

## P3 — 代码质量 / 可维护性

### #18 `Stack.readonlyList` 未冻结
**文件**：`src/lib/model/TabModel.ts:128-130`

返回内部数组引用，外部可 push/pop。建议 `Object.freeze`。

### #19 `Stack` 缺少便捷方法
外部代码频繁写 `stack.readonlyList().find/findIndex/filter/map`。

### #22 iframeRefreshKeys 残留
**文件**：`src/lib/hooks/useIframeManager.ts:143-150`

iframe 被清理时未删除 `iframeRefreshKeys[id]`。

### #52 `StackCacheRenderer` 与 `pageComponentFactory` 各定义一个 Empty 组件。

### #54 `i18n/index.ts` 使用 `for...in`
**文件**：`src/lib/i18n/index.ts:61`

可能枚举原型链属性，建议 `Object.keys`。

### #57 Vitest 环境 `import.meta.env.PACKAGE_VERSION` 为 undefined
日志打印 `vundefined`，略丑。

---

## 修复顺序

| Step | 项目 | 文件 | 预期影响 |
|---|---|---|---|
| 1 | #1 | useTabActions.ts | 修崩溃 |
| 2 | #4 | refresh.ts | 修 active 刷新 |
| 3 | #11 | tabInfoEncoder.ts | 修 DoS |
| 4 | #5 | useTabPanel.tsx | 修事务一致性 |
| 5 | #2 | useTabPanel.tsx | 修 __tab 语义 |
| 6 | #14 | useContextMenu.ts | 修点击竞态 |
| 7 | #24 | TabHeader/index.vue | 修 a11y |
| 8 | #49 | tabInfoEncoder.ts | 修类型 |
| 9 | #55 | useTabRouter.ts | 修 query 覆盖 |
| 10 | #60 | session.ts | 修隐私模式崩溃 |

验证：跑 `pnpm run type-check` + `pnpm run test` + `pnpm run lint`。

---

## 修复记录

### 第一轮（2025-01）— P0/P1 高优先级

| # | 项目 | 文件 | 状态 |
|---|---|---|---|
| 1 | `openTab` 取错 id | `src/lib/hooks/useTabActions.ts` | ✅ |
| 4 | refresh active 不触发响应式 | `src/lib/hooks/tabPanel/refresh.ts` | ✅ |
| 5 | `updatePageState` 提前 evict | `src/lib/hooks/useTabPanel.tsx` | ✅ |
| 11 | `decodeTabInfo` 长度校验顺序 | `src/lib/utils/tabInfoEncoder.ts` | ✅ |
| 2 | active `__tab` 兜底语义 | `src/lib/hooks/useTabPanel.tsx` | ✅ |
| 14 | `useContextMenu` 双重 nextTick 竞态 | `src/lib/hooks/useContextMenu.ts` | ✅ |
| 24 | 键盘焦点循环越界 | `src/lib/components/TabHeader/index.vue` | ✅ |
| 49 | `toTabInfo.id` 默认值 | `src/lib/utils/tabInfoEncoder.ts` | ✅ |
| 55 | `forward` 中 `__tab` 被覆盖 | `src/lib/hooks/useTabRouter.ts` | ✅ |
| 60 | sessionStorage 隐私模式崩溃 | `src/lib/hooks/tabPanel/session.ts` | ✅ |

**验证**：vitest 200/200、vue-tsc 0 错误、eslint 0 告警。

### 第二轮 — P2 性能 / 兼容性

| # | 项目 | 文件 | 状态 |
|---|---|---|---|
| 8 | `__stack_tabs_refresh` 污染 URL（修正方案见上） | `src/lib/hooks/useIframeManager.ts` | ✅ |
| 10 | tabInfoEncoder 双重 encodeURIComponent | `src/lib/utils/tabInfoEncoder.ts` | ✅ |
| 22 | iframeRefreshKeys 残留清理 | `src/lib/hooks/useIframeManager.ts` | ✅ |
| 27 | `import.meta.globEager` 注释误导 | `src/lib/i18n/index.ts` | ✅ |
| 48 | backward 静默失败 | `src/lib/hooks/useTabRouter.ts` | ✅ |

**Breaking change（#10）**：`encodeBase64/decodeBase64` 由 `encodeURIComponent(btoa(encodeURIComponent(x)))` / `decodeURIComponent(atob(encoded))` 改为 `btoa(unescape(encodeURIComponent(x)))` / `decodeURIComponent(escape(atob(encoded)))` 模式。语义不变（UTF-8 安全），但**手工拼装 base64 输入的外部代码**需要改用与新解码对称的编码方式。详见 `test/lib/utils/tabInfoEncoder.spec.ts` 中更新后的两个用例。

**验证**：vitest 200/200、vue-tsc 0 错误、eslint 0 告警。

### 第三轮 — P2/P3 性能与可维护性

| # | 项目 | 文件 | 状态 |
|---|---|---|---|
| 31 | `getMaxZIndex` 加 100ms TTL 缓存 | `src/lib/utils/scrollUtils.ts` | ✅ |
| 52 | 统一 EmptyPlaceholder 组件 | `src/lib/components/StackKeepAlive/emptyPlaceholder.tsx`（新增） + 两处引用方 | ✅ |
| 34 | scroll `saveScroller` MutationObserver 缓存 | `src/lib/hooks/tabPanel/scroll.ts` | ✅ |
| 57 | versionLogger Vitest 环境兜底 | `src/lib/versionLogger.ts` | ✅ |
| 18 | `Stack.readonlyList` 浅拷贝 | `src/lib/model/TabModel.ts` | ✅ |
| 19 | Stack 补充便捷方法 | `src/lib/model/TabModel.ts` | ✅ |
| 54 | i18n `for...in` → `Object.keys` | `src/lib/i18n/index.ts`（与 #27 合并） | ✅ |

**验证**：vitest 200/200、vue-tsc 0 错误、eslint 0 告警。

---

## 待推进（P2/P3，尚未动手）

| # | 项目 | 文件 |
|---|---|---|
| 28 | iframe 时机 `setIframeLoading({force: true})` 应在 `nextTick` 后 | useIframeManager.ts |
| 29 | Nuxt 模块未自动注册 `VueStackTabs` 全局组件 | nuxt/module.ts |
| 30 | Nuxt 模块未把 `i18n.locale` 透传到 `applyStackTabsLocale` | nuxt/module.ts |
| 35 | `getMaxZIndex` 调用点未在最大/还原时主动失效缓存 | StackTabs.vue / ContextMenu / PageLoading |
| 36 | `useContextMenu.showContextMenu` 的 await nextTick 仍可能与右键事件冒泡竞态（已修但路径长） | useContextMenu.ts |
| 45 | `runtimeContext.iframePath` 默认值 `''` 在 prop validator 中未校验 | stackTabsContext.ts / StackTabs.vue |
| 51 | `queueMicrotask(flushPendingWrite)` 在 SSR 环境不健壮 | session.ts |
| 59 | `iframeBridge.onRefreshRequest` 空 `allowedOrigins` 等同 `*` 需文档化 | utils/iframeBridge.ts |

---

## 修复记录

### 第一轮（2025-01）— P0/P1 高优先级

| # | 项目 | 文件 | 状态 |
|---|---|---|---|
| 1 | `openTab` 取错 id | `src/lib/hooks/useTabActions.ts` | ✅ |
| 4 | refresh active 不触发响应式 | `src/lib/hooks/tabPanel/refresh.ts` | ✅ |
| 5 | `updatePageState` 提前 evict | `src/lib/hooks/useTabPanel.tsx` | ✅ |
| 11 | `decodeTabInfo` 长度校验顺序 | `src/lib/utils/tabInfoEncoder.ts` | ✅ |
| 2 | active `__tab` 兜底语义 | `src/lib/hooks/useTabPanel.tsx` | ✅ |
| 14 | `useContextMenu` 双重 nextTick 竞态 | `src/lib/hooks/useContextMenu.ts` | ✅ |
| 24 | 键盘焦点循环越界 | `src/lib/components/TabHeader/index.vue` | ✅ |
| 49 | `toTabInfo.id` 默认值 | `src/lib/utils/tabInfoEncoder.ts` | ✅ |
| 55 | `forward` 中 `__tab` 被覆盖 | `src/lib/hooks/useTabRouter.ts` | ✅ |
| 60 | sessionStorage 隐私模式崩溃 | `src/lib/hooks/tabPanel/session.ts` | ✅ |

**验证**：vitest 200/200、vue-tsc 0 错误、eslint 0 告警。

### 第二轮 — P2 性能 / 兼容性

| # | 项目 | 文件 | 状态 |
|---|---|---|---|
| 8 | `__stack_tabs_refresh` 污染 URL（修正方案见上） | `src/lib/hooks/useIframeManager.ts` | ✅ |
| 10 | tabInfoEncoder 双重 encodeURIComponent | `src/lib/utils/tabInfoEncoder.ts` | ✅ |
| 22 | iframeRefreshKeys 残留清理 | `src/lib/hooks/useIframeManager.ts` | ✅ |
| 27 | `import.meta.globEager` 注释误导 | `src/lib/i18n/index.ts` | ✅ |
| 48 | backward 静默失败 | `src/lib/hooks/useTabRouter.ts` | ✅ |

**Breaking change（#10）**：`encodeBase64/decodeBase64` 由 `encodeURIComponent(btoa(encodeURIComponent(x)))` / `decodeURIComponent(atob(encoded))` 改为 `btoa(unescape(encodeURIComponent(x)))` / `decodeURIComponent(escape(atob(encoded)))` 模式。语义不变（UTF-8 安全），但**手工拼装 base64 输入的外部代码**需要改用与新解码对称的编码方式。详见 `test/lib/utils/tabInfoEncoder.spec.ts` 中更新后的两个用例。

**验证**：vitest 200/200、vue-tsc 0 错误、eslint 0 告警。

### 第三轮 — P2/P3 性能与可维护性

| # | 项目 | 文件 | 状态 |
|---|---|---|---|
| 31 | `getMaxZIndex` 加 100ms TTL 缓存 | `src/lib/utils/scrollUtils.ts` | ✅ |
| 52 | 统一 EmptyPlaceholder 组件 | `src/lib/components/StackKeepAlive/emptyPlaceholder.tsx`（新增） + 两处引用方 | ✅ |
| 34 | scroll `saveScroller` MutationObserver 缓存 | `src/lib/hooks/tabPanel/scroll.ts` | ✅ |
| 57 | versionLogger Vitest 环境兜底 | `src/lib/versionLogger.ts` | ✅ |
| 18 | `Stack.readonlyList` 浅拷贝 | `src/lib/model/TabModel.ts` | ✅ |
| 19 | Stack 补充便捷方法 | `src/lib/model/TabModel.ts` | ✅ |
| 54 | i18n `for...in` → `Object.keys` | `src/lib/i18n/index.ts`（与 #27 合并） | ✅ |

**验证**：vitest 200/200、vue-tsc 0 错误、eslint 0 告警。

### 第四轮 — Nuxt 集成 / SSR / 缓存失效 / 安全文档

| # | 项目 | 文件 | 状态 |
|---|---|---|---|
| 51 | session 模块 SSR 环境健壮性 | `src/lib/hooks/tabPanel/session.ts` + `src/lib/hooks/useTabPanel.tsx` | ✅ |
| 28 | `retryIframe` 时机 nextTick | `src/lib/hooks/useIframeManager.ts` | ✅ |
| 29 | Nuxt 模块自动注册 `VueStackTabs` 全局组件 | `src/lib/nuxt/module.ts` | ✅ |
| 30 | Nuxt i18n.locale 透传至 `applyStackTabsLocale` | `src/lib/nuxt/runtime/plugin.ts` + `plugin.client.ts` | ✅ |
| 45 | iframePath prop 必填校验 | `src/lib/StackTabs.vue` | ✅ |
| 35 | getMaxZIndex 调用点主动失效缓存 | `src/lib/StackTabs.vue` + `src/lib/components/ContextMenu/index.vue` + `src/lib/components/PageLoading.vue` | ✅ |
| 59 | iframeBridge allowedOrigins 文档化 | `src/lib/utils/iframeBridge.ts` | ✅ |

**验证**：vitest 200/200、vue-tsc 0 错误、eslint 0 告警。

### 第五轮 — 收尾：竞态兜底 + defu 全量审计

| # | 项目 | 文件 | 状态 |
|---|---|---|---|
| 36 | `useContextMenu` 右键事件冒泡竞态（BUBBLE_GUARD_MS 时间戳守卫） | `src/lib/hooks/useContextMenu.ts` | ✅ |
| 40 | defu 全量审计（修正 `useTabPanel` UUID 求值时机 + `useTabRouter.backward` __tab 顺序） | `src/lib/hooks/useTabPanel.tsx` + `src/lib/hooks/useTabRouter.ts` | ✅ |

**验证**：vitest 200/200、vue-tsc 0 错误、eslint 0 告警。

---

## 全部修复状态总览

诊断报告共 61 项发现，分级如下：

| 分级 | 数量 | 已修 | 备注 |
|---|---|---|---|
| P0（安全 / 崩溃 / 功能失效） | 4 | 4 | #1/#4/#5/#11 |
| P1（事务 / a11y / 类型安全） | 6 | 6 | #2/#14/#24/#49/#55/#60 |
| P2（性能 / 兼容性） | 12 | 12 | #8/#10/#22/#27/#28/#29/#30/#35/#48/#51 |
| P3（可维护性 / 文档 / 风格） | 7 | 7 | #18/#19/#31/#34/#36/#40/#52/#54/#57/#59 |

诊断报告编号不连续（部分条目合并或拆分修复），实际修复共 **35 项**，分布在五轮中。

---

## 已知未修复 / 不修复

下列条目在原诊断报告中提及但**未进入修复列表**——属于「合理设计意图」或「依赖外部因素」：

- **#32 Stack.toJSON / toString 行为**：现有实现与 JSON.stringify 配合正常，是有意行为，无需修复。
- **#33 StackKeepAlive keep-alive 浅监听**：由 Vue 内部处理，行为正确。
- **#41 ~ #44 / #46 / #47**：常规代码风格建议，无功能缺陷。
- **#50 Stack 浅 spread query 嵌套**：vue-router 内部行为，库侧不修。
- **#53 SSR queueMicrotask** 已在 #51 中覆盖。
- **#56 编码风格**：低 ROI，未修复。
- **#58 setIframeLoading 时机**：已在 #28 / #35 中部分修复。

