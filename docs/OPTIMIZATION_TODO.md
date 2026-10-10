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

| 项目 | 文件 | 状态 |
|---|---|---|
| `getMaxZIndex` 加 100ms TTL 缓存 + `invalidateZIndexCache` 导出 | `src/lib/utils/scrollUtils.ts` | ✅ |
| 抽出共享 `EmptyPlaceholderComponent`（消除两份等价副本） | `src/lib/components/StackKeepAlive/emptyPlaceholder.tsx`（新增） | ✅ |
| `saveScroller` 用 MutationObserver 缓存 `[data-stack-tab-scroll]` 列表 | `src/lib/hooks/tabPanel/scroll.ts` | ✅ |
| `Stack.readonlyList` 改为返回浅拷贝 | `src/lib/model/TabModel.ts` | ✅ |
| `Stack` 新增 `find/findIndex/filter/some/forEachTopDown` 便捷方法 | `src/lib/model/TabModel.ts` | ✅ |
| `versionLogger` 在 Vitest 等环境无版本号时显示 `vdev` 兜底 | `src/lib/versionLogger.ts` | ✅ |

### 第四轮（Nuxt 集成 / SSR / 缓存失效）

| 项目 | 文件 | 状态 |
|---|---|---|
| `session` 模块 SSR 环境 `typeof window` 守卫（隐私模式 + Nuxt SSR） | `src/lib/hooks/tabPanel/session.ts` + `useTabPanel.tsx` | ✅ |
| Nuxt 模块用 `addComponent` 自动注册 `VueStackTabs` 全局组件 | `src/lib/nuxt/module.ts` | ✅ |
| Nuxt plugin 显式调用 `applyStackTabsLocale(changeLocale, locale)` | `src/lib/nuxt/runtime/plugin*.ts` | ✅ |
| `iframePath` prop 必填校验（开发期抛 Error） | `src/lib/StackTabs.vue` | ✅ |
| 三个调用点主动 `invalidateZIndexCache` 让 z-index 重算 | `StackTabs.vue` / `ContextMenu/index.vue` / `PageLoading.vue` | ✅ |
| `iframeBridge.onRefreshRequest` 加 origin 校验安全文档 | `src/lib/utils/iframeBridge.ts` | ✅ |

### 第五轮（收尾）

| 项目 | 文件 | 状态 |
|---|---|---|
| `useContextMenu` 加 `BUBBLE_GUARD_MS=250ms` 时间戳守卫 | `src/lib/hooks/useContextMenu.ts` | ✅ |
| defu 全量审计：UUID 求值时机 + backward `__tab` 顺序 | `src/lib/hooks/useTabPanel.tsx` + `useTabRouter.ts` | ✅ |

---

## 9. 已知未优化 / 不优化

- **`Stack.toJSON` / `toString` 行为**：与 JSON.stringify 配合正常，是有意行为。
- **`i18n.mergeLocaleMessages` `__proto__` 黑名单**：`Object.entries` 已天然不枚举 `__proto__`，黑名单是冗余防御但可保留作注释。
- **`Stack.find/findIndex` 等只读方法重复声明**：库内部仍允许调用方根据习惯选择 `readonlyList().find(...)`，不强制迁移。

