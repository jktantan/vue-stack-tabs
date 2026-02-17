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
