# 子路由功能实现分析报告

> **实现状态**：已在 demo 中作为 **试验性功能** 落地，参见 [SUBROUTE_EXPERIMENTAL.md](./SUBROUTE_EXPERIMENTAL.md)。

## 1. 背景与定义

**「子路由」** 在本文中指以下两种常见诉求之一或兼有：

| 类型 | 描述 | 示例 |
|------|------|------|
| A. 页面内嵌子路由 | 某页面有 `children`，自身含 `<router-view>`，子路径在同一标签内切换 | `/demo/test2` → `/demo/test2/detail` → `/demo/test2/settings` |
| B. 标签内多级路径栈 | 同标签内通过 `forward`/`backward` 在多个路径间前进/后退，形成页面栈 | 首页 → 列表 → 详情 → 返回列表 → 返回首页 |

---

## 2. 现有架构梳理

### 2.1 路由与缓存

- **路由结构**：`/demo` 为父级，`test2`、`test3`、`iframe` 等为其 `children`，同一层级。
- **缓存标识**：`createPageId(tabId, path, query)`，以 `tabId + path + query`（不含 `__tab`）生成 keep-alive 缓存 ID。
- **路径处理**：`normalizePathForCache(route)` 使用 `route.matched` 最后一项的 `path` 或 `route.path`，已覆盖带动态参数等路径（如 `/detail/:id`）。
- **页面栈**：每个 tab 有 `Stack<ITabPage>`，每页包含 `id`（即 cacheName）、`path`、`query`。

### 2.2 关键流程

```
route 变化 → router-view 渲染 (Component, route)
    → addPage(route, Component) → tabWrapper
    → updatePageState：解析 __tab、生成 cacheName、查找/创建 tab、创建/复用 page
    → resolvePageComponent：包装为带 keep-alive 的缓存组件
```

### 2.3 useTabRouter（标签内路由）

- `forward(to)`：`router.push`，将新 path 加入当前 tab 的 pages 栈。
- `backward(to)`：从 pages 栈 `pop`，并按 `path` 匹配回退目标，执行 `router.push`。

---

## 3. 子路由支持情况分析

### 3.1 类型 A：页面内嵌子路由

**实现思路**：在 Vue Router 中给对应路由配置 `children`，页面组件内部使用 `<router-view>` 渲染子级。

```js
// 路由示例
{
  path: 'test2',
  component: Test2Layout,
  children: [
    { path: '', component: Test2Home },
    { path: 'detail', component: Test2Detail },
    { path: 'detail/:id', component: Test2Detail }
  ]
}
```

**与当前实现的关系：**

| 环节 | 结论 | 说明 |
|------|------|------|
| `route.path` | ✅ 已支持 | 子路由如 `/demo/test2/detail`，`route.path` 为完整路径 |
| `normalizePathForCache` | ✅ 已支持 | 当 `matchPath !== path` 时返回 `route.path`（见 spec） |
| `createPageId` | ✅ 已支持 | 以完整 path + query 生成唯一 cacheName |
| `pages` 栈 | ✅ 已支持 | 每种子路径对应一个 page，可分别缓存 |
| `forward`/`backward` | ✅ 已支持 | 基于 path 匹配回退，可处理多级路径 |

**结论**：类型 A 在现有逻辑下即可工作，无需修改库代码。使用者只需：

1. 配置 `children`；
2. 在父级组件中放置 `<router-view>`；
3. 在子页面中按需使用 `useTabRouter().forward()` / `backward()` 做导航。

### 3.2 类型 B：标签内多级路径栈

已在现有设计中实现：

- `forward()` 向当前 tab 的 pages 栈 push 新 page；
- `backward()` 从栈中 pop，并跳转到目标 path；
- keep-alive 按 cacheName 缓存各 path 对应组件。

子路径（如 `/demo/test2/detail`）会得到不同于 `/demo/test2` 的 cacheName，从而分别缓存，满足类型 B 的需求。

---

## 4. 潜在问题与边界情况

### 4.1 router-view 层级

当前 StackTabs 中只有**一个** `router-view`，渲染 Vue Router 在「当前层级」匹配到的组件。

- 若使用 `children`，该层级会得到**父级组件**（如 `Test2Layout`），其内部 `<router-view>` 负责渲染子级。
- 每次路由变化时，`route` 会不同，`Component` 仍可能是同一父级组件；但 `cacheName` 由 `path + query` 决定，不同子路径会得到不同缓存，行为正确。

无需改动。

### 4.2 多个同级 router-view（Named Views）

若路由使用 `components: { default, sidebar }` 等多出口，当前架构只处理默认的单一出口，多出口需要额外设计，属扩展功能，非「子路由」核心场景。

### 4.3 backward 的 path 匹配

```ts
// useTabRouter backward 逻辑
if (pages[i]?.path === parsed.path) { found = true; break }
```

`parsed.path` 来自 `parseUrl(to)`。若传入完整 path（如 `/demo/test2`），需保证 `parseUrl` 能正确解析；当前 `route.path` 在 `ITabPage` 中存的是完整路径，匹配逻辑应能覆盖子路由场景。建议在实现后用子路由路径做一次回归测试。

### 4.4 浏览器前进/后退按钮

用户点击浏览器前进/后退时，会直接改变路由，不经过 `forward`/`backward`。当前逻辑：

- 路由变化会触发 `addPage`；
- `updatePageState` 会查找已有 tab，并向其 pages 栈 push 新 page（若 path 不同）。

因此，通过浏览器前进/后退产生的 history 与通过 `forward` 产生的栈并不完全一致，可能发生：

- 浏览器后退时，路由已变，但 pages 栈未 pop，导致栈与 URL 不一致；
- 或需要监听 `popstate`，在浏览器后退时同步 pop 栈。

这是已知的「history 与内部栈同步」问题，与是否使用子路由无关，实现子路由时一并考虑即可。

---

## 5. 实现建议

### 5.1 立即可做（类型 A/B）

1. 在示例或文档中补充「子路由」示例，例如：

   - 路由：

     ```js
     {
       path: 'test2',
       component: () => import('@/views/demo/Test2Layout.vue'),
       children: [
         { path: '', component: () => import('@/views/demo/Test2Home.vue') },
         { path: 'detail/:id', component: () => import('@/views/demo/Test2Detail.vue') }
       ]
     }
     ```

   - `Test2Layout.vue` 中：

     ```vue
     <template>
       <div>
         <nav>...</nav>
         <router-view />
       </div>
     </template>
     ```

2. 在 `Test2Home`、`Test2Detail` 中使用 `forward`/`backward` 做标签内导航。

### 5.2 可选增强

| 项目 | 内容 |
|------|------|
| 浏览器 history 同步 | 监听 `popstate`，在用户点击前进/后退时对 pages 栈做 push/pop，保持栈与 URL 一致 |
| 文档 | 在 README 或文档中明确说明子路由的配置方式与使用示例 |
| 单元测试 | 为 `normalizePathForCache`、`createPageId` 增加子路由 path 用例，覆盖 `/demo/test2/detail` 等 |

---

## 6. 总结

| 维度 | 结论 |
|------|------|
| **能否实现** | ✅ 能实现 |
| **是否需要改库** | ❌ 基本不需要，现有设计已支持 |
| **使用者需要做的** | 配置 `children`、在父组件中加 `<router-view>`、按需使用 `forward`/`backward` |
| **建议** | 补充示例、文档和测试；可选实现浏览器 history 与 pages 栈的同步 |

**结论**：子路由功能在现有架构下即可实现，主要工作集中在配置、示例和文档上，无需对 vue-stack-tabs 做大改。

---

## 7. 多级子路由与缓存控制

### 7.1 多级子路由是否支持？

✅ **支持**。`createPageId(tabId, path, query)` 使用完整 `route.path`，多级路径（如 `/demo/test2/detail/edit`）会得到唯一 cacheName，每一级都能正确缓存。

### 7.2 缓存机制简述

| 环节 | 逻辑 |
|------|------|
| **缓存标识** | `cacheName = hash(tabId + path + query)`，不同 path 得到不同 cache，互不共享 |
| **keep-alive** | `include=caches`，每个 cacheName 对应一个组件实例 |
| **组件命名** | 包装组件 `name: cacheName`，用于 keep-alive 匹配 |
| **驱逐** | `backward` 时 pop 并 `markCacheForEviction`；关 tab 时 `markTabPagesForEviction` 遍历栈内所有 page |

### 7.3 多级子路由下的组件形态

在嵌套路由下，**StackTabs 的 router-view 只接收「当前层级」的组件**（多为带 `<router-view>` 的父组件）：

- `/demo/test2` → Component = Test2Layout（含 router-view）
- `/demo/test2/detail` → Component = Test2Layout
- `/demo/test2/detail/edit` → Component = Test2Layout

虽 Component 相同，但 path 不同 → cacheName 不同 → 会生成多个包装实例，每个实例保存对应层级的完整渲染树，**缓存互不干扰**。

### 7.4 潜在问题

| 问题 | 风险 | 说明 |
|------|------|------|
| **1. 缓存数量膨胀** | 中 | 同 tab 内深度导航（如 10+ 级）会产生 10+ 个 keep-alive 实例，无 `max` 限制。关闭 tab 会一次性驱逐，`backward` 会逐个驱逐，可接受，但需关注内存。 |
| **2. 刷新粒度** | 低 | `refreshTab` 只 exclude 栈顶 page，栈内其余 page 仍缓存。符合「只刷新当前页」的预期。 |
| **3. 同一 path 不同 tab** | 无 | 不同 tabId → 不同 cacheName，不会串缓存。 |
| **4. 浏览器前进/后退** | 中 | 与 4.4 节一致：不经过 `backward`，pages 栈可能与 history 不同步，属通用问题，非多级子路由特有。 |
| **5. `caches` 与 `components` 一致性** | 低 | 驱逐时同时 `removeCache`、`components.delete`，逻辑一致。若未来有异步或边界分支，需保证两处同步。 |

### 7.5 结论

多级子路由可以正常工作，**缓存控制逻辑是合理的**，无需为子路由单独改动。建议：

- 对深层导航（如 5 层以上）做一次内存与性能测试；
- 如需控制总缓存数，可考虑给 keep-alive 增加 `max`，或增加「按 tab 限制 pages 栈深度」的逻辑。
