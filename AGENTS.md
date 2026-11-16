# vue-stack-tabs — AI 助手项目指南

> 供 AI 助手理解项目结构、修改代码和运行验证。仅提供原则与大纲，具体实现需分析代码库获取。
> 最后更新：2026-11-17（声明文件扩展名修复 3.3.3、文档与代码对齐审计后）。

---

## 项目概述

Vue 3 多标签页管理库，基于 Vue Router。设计思想：用 Vue 作用域实现类似 iframe TabPanel 的效果——每个 Tab 间组件作用域互不干扰，替代「一个 Tab 一个 iframe」的模式。

**功能：**

- 路由级标签页、iframe 标签页
- 标签增删、刷新、批量关闭（全部/左侧/右侧/其他）
- 标签内前进/后退（栈式导航）
- 滚动位置记忆、会话恢复（只恢复上次激活的标签及其页面栈）
- Nuxt 3/4 模块
- 子路由（试验性）

---

## 目录与职责

| 目录                      | 职责                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/`                | 核心库，构建到 `dist/`（`StackTabs.vue`、`iframe.vue`、`i18n/`、`versionLogger.ts`）                                                                                                                                                                                                                                                                                                              |
| `src/lib/hooks/`          | 状态与业务逻辑（14 个）：`useTabPanel.tsx`（核心，被 `useTabActions`/`useTabRouter` 复用）、`useTabActions`（对外 API）、`useTabRouter`（栈内导航）、`useTabLoading`、`useTabPageScroll`、`useTabScrollShadow`、`useScrollShadow`、`useContextMenu`、`useIframeManager`、`useTabEventBus`、`stackTabsContext`（运行时上下文）、`tabPageContext`、`tabPageScrollContext`、`tabScrollShadowContext` |
| `src/lib/hooks/tabPanel/` | 内部子模块（8）：`state`（共享响应式）、`tabStore`（标签/缓存数据层，不依赖 vue-router）、`evict`（缓存驱逐）、`refresh`（单页/全量刷新）、`scroll`（滚动位置）、`session`（SSR 安全持久化）、`navigationTransaction`（apply/rollback/cleanupStale）、`pageComponentFactory.tsx`（cacheComponent 工厂）                                                                                           |
| `src/lib/components/`     | UI 组件（10）：`TabHeader/`（`index.vue`、`TabHeaderItem`、`TabHeaderButton`、`TabHeaderScroll`）、`ContextMenu/`（`index.vue`、`ContextMenuItem`）、`PageLoading.vue`、`StackKeepAlive/`（`StackKeepAlive.vue`、`StackCacheRenderer.vue`、共享 `emptyPlaceholder.tsx`）                                                                                                                          |
| `src/lib/utils/`          | 工具函数（7）：`tabInfoEncoder`（`__tab` 编解码 + UUID）、`urlParser`（URL 解析与安全校验）、`scrollUtils`（DOM 滚动 + z-index 缓存）、`iframeBridge`（iframe postMessage 桥）、`stackTabsMessage`（消息校验）、`stackTabsA11y`（ARIA id）、`typeGuards`                                                                                                                                          |
| `src/lib/model/`          | 类型定义（3）：`TabModel.ts`（`TabScrollMode`、`ITabData` 等 + `Stack<T>` 类）、`ScrollAdapter.ts`（滚动适配器契约）、`PageScroll.ts`（页级滚动模式）                                                                                                                                                                                                                                             |
| `src/lib/nuxt/`           | Nuxt 模块（`vue-stack-tabs/nuxt`）：`module.ts`（自动注册 `VueStackTabs` 全局组件、自动导入 hooks）+ `runtime/plugin.ts`（locale 透传）                                                                                                                                                                                                                                                           |
| `src/lib/assets/style/`   | SCSS 样式，变量和 mixins 在 `common/`                                                                                                                                                                                                                                                                                                                                                             |
| `scripts/`                | 构建/验证脚本（4）：`fix-dts-extensions.mjs`（用 TS 编译器 API 把 dist 内相对说明符补 `.js`，`--check` 只校验）、`write-entry-dts.mjs`（手写入口声明）、`verify-prepack.mjs`（打包前全覆盖）、`verify-packaged.mjs`（tarball + Bundler/NodeNext 双模式类型验证）                                                                                                                                  |
| `docs/`                   | VitePress 文档：英文在根目录、中文在 `docs/zh/`；内部分析文档（`DIAGNOSTIC_REPORT.md` / `OPTIMIZATION_TODO.md` / `SUBROUTE_*.md` / `DEPLOY.md` / `superpowers/`）用 `srcExclude` 排除，不上站                                                                                                                                                                                                     |

---

## 核心逻辑（栈模型）

- 每个标签由 `Stack<ITabPage>` 组成，栈顶为当前显示页
- 同一组件可出现在多个标签栈中，缓存由 `createPageId()` 生成的 UUID 独立标识
- **进栈**：`forward` → `router.push` → `addPage` → keep-alive 缓存
- **出栈**：`backward` → `stack.pop` + `markCacheForEviction` → 驱逐缓存
- **关闭标签**：`markTabPagesForEviction` 遍历栈内所有 page，`evictMarkedCaches` 执行驱逐
- **会话恢复**：只持久化上次激活的标签及其页面栈（`session.ts`，`sessionStorage`）

---

## 关键导出与依赖关系

- **对外 API**（`src/lib/index.ts`）：
  - 组件：`VueStackTabs`（即 `StackTab`）、`IFrame`、`TabHeaderButton`
  - Hooks：`useTabActions`、`useTabRouter`、`useTabLoading`、`useTabPageScroll`、`useTabScrollShadow`
  - iframe 桥：`postOpenTab`、`onRefreshRequest`、`MSG_REFRESH`、`MSG_OPEN_TAB`
  - 上下文：`tabPageContextKey`、`resolveTabPageContext`
  - 类型：`export * from './model/TabModel'`（`TabScrollMode`、`ITabData`、`Stack` 等）+ `StackTabsScrollAdapter` / `TabScrollShadowController` / `TabPageContext` 等 `export type`
- **子入口**：`vue-stack-tabs/nuxt`、`vue-stack-tabs/iframe-bridge`、`vue-stack-tabs/dist/style.css`；包为 **ESM-only**（无 CommonJS 入口）
- **内部核心**：`useTabPanel` 管理 tabs、caches、components、evict；被 useTabActions、useTabRouter、StackTabs 使用
- **共享状态**：`tabPanel/state.ts`（响应式状态）与 `tabPanel/tabStore.ts`（数据层）

---

## 修改原则

1. **不破坏对外 API**：保持 `index.ts` 已导出组件、hooks、类型的签名与行为；`encodeBase64` 是底层编码方式调整，外部手工拼装 base64 的代码需同步调整（详见 `docs/DIAGNOSTIC_REPORT.md` 第二轮）
2. **分层**：工具放 `utils`，逻辑放 `hooks`，UI 放 `components`；共享占位组件放 `components/StackKeepAlive/emptyPlaceholder.tsx`
3. **缓存驱逐时序**：路由同步路径用 `markCacheForEviction` 标记，统一在 `onActivated` / `evictMarkedCaches` 异步清理；不要在路由未稳定前直接 `evictPageCache`
4. **Nuxt**：仅改 `src/lib/nuxt/`，主库逻辑保持通用；Nuxt 模块已用 `addComponent` 自动注册 `VueStackTabs`
5. **样式**：SCSS，变量和 mixins 在 `assets/style/common/`
6. **注释**：关键逻辑补充 JSDoc 或行内注释
7. **重构后必做**：跨文件 import 路径变更后，跑 `pnpm run test` + `pnpm run type-check`；必要时在浏览器 dev server 手动验证 ESM 解析（vitest 宽容解析可能漏掉运行时 SyntaxError）
8. **声明文件**：`lib:build` 末尾会自动执行 `scripts/fix-dts-extensions.mjs` 给 dist 内相对导入补 `.js`；不要手改 dist，改了源码后重新构建即可

---

## 验证流程

修改后需执行：

```bash
# 1. 类型检查
pnpm run type-check

# 2. 单元测试
pnpm run test

# 3. 代码规范
pnpm run lint
pnpm run lint:style:check

# 4. 格式化检查（可选）
pnpm run format:check

# 5. 打包前全覆盖（单元 + Vue 主项目 + Nuxt 源码构建）
pnpm run test:prepack

# 6. 库构建（含 dist 声明文件扩展名自动修正）
pnpm run lib:build

# 7. 声明文件扩展名复检（防回归）
pnpm run dts:check

# 8. 打包后验证（dist 入口 + Bundler/NodeNext 双重类型 + tarball ESM 导入）
pnpm run test:packaged

# 9. 发布前一条龙（上述检查全跑一遍并产出 tarball）
pnpm run release:check
```

**本地演示：** `pnpm run dev`  
**文档预览：** `pnpm run docs:dev`

---

## 测试说明

- **单元测试**：`src/**/*.spec.ts`，Vitest，环境 `node`（部分 spec 使用 `@vitest-environment happy-dom`）

---

## 参考文档

- 架构设计：`ARCHITECTURE.md`
- 完整诊断报告（含五轮修复记录）：`docs/DIAGNOSTIC_REPORT.md`
- 性能优化记录：`docs/OPTIMIZATION_TODO.md`
- 子路由分析：`docs/SUBROUTE_ANALYSIS.md`、`docs/SUBROUTE_EXPERIMENTAL.md`
- 贡献指南：`CONTRIBUTING.md`
- 用户文档：`docs/base/`、`docs/advance/`、`docs/more/`（英文根目录 + `docs/zh/` 中文）；排障页 `docs/base/troubleshooting.md`
- 版本与变更：`package.json`（3.3.3）+ `CHANGELOG.md`
