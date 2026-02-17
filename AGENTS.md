# vue-stack-tabs — AI 助手项目指南

> 供 AI 助手理解项目结构、修改代码和运行验证。仅提供原则与大纲，具体实现需分析代码库获取。

---

## 项目概述

Vue 3 多标签页管理库，基于 Vue Router。设计思想：用 Vue 作用域实现类似 iframe TabPanel 的效果——每个 Tab 间组件作用域互不干扰，替代「一个 Tab 一个 iframe」的模式。

**功能：**

- 路由级标签页、iframe 标签页
- 标签增删、刷新、批量关闭（全部/左侧/右侧/其他）
- 标签内前进/后退（栈式导航）
- 滚动位置记忆、会话恢复
- Nuxt 3/4 模块
- 子路由（试验性）

---

## 目录与职责

| 目录 | 职责 |
|------|------|
| `src/lib/` | 核心库，构建到 `dist/` |
| `src/lib/hooks/` | 状态与业务逻辑（useTabPanel、useTabActions、useTabRouter 等） |
| `src/lib/hooks/tabPanel/` | 内部子模块：state、evict、scroll、session |
| `src/lib/components/` | UI 组件（TabHeader、ContextMenu、PageLoading） |
| `src/lib/utils/` | 工具函数（tabInfoEncoder、urlParser、scrollUtils、iframeBridge） |
| `src/lib/model/` | 类型定义（TabModel、Stack） |
| `src/lib/nuxt/` | Nuxt 模块（`vue-stack-tabs/nuxt` 导出） |
| `src/lib/assets/style/` | SCSS 样式，变量和 mixins 在 `common/` |
| `playgrounds/` | 验证用：vue（Vue + dist）、nuxt（Nuxt + dist） |
| `scripts/` | 验证脚本：verify-prepack.mjs、verify-packaged.mjs |
| `docs/` | VitePress 文档（`docs/zh/`）及分析文档 |

---

## 核心逻辑（栈模型）

- 每个标签由 `Stack<ITabPage>` 组成，栈顶为当前显示页
- 同一组件可出现在多个标签栈中，缓存由 `createPageId(tabId, path, query)` 独立标识
- **进栈**：`forward` → `router.push` → `addPage` → keep-alive 缓存
- **出栈**：`backward` → `stack.pop` + `markCacheForEviction` → 驱逐缓存
- **关闭标签**：`markTabPagesForEviction` 遍历栈内所有 page，`evictMarkedCaches` 执行驱逐

---

## 关键导出与依赖关系

- **对外 API**：`index.ts` 导出 VueStackTabs、useTabActions、useTabRouter、useTabLoading、IFrame、TabHeaderButton、postOpenTab、onRefreshRequest
- **内部核心**：`useTabPanel` 管理 tabs、caches、components、evict；被 useTabActions、useTabRouter、StackTabs 使用
- **共享状态**：`tabPanel/state.ts` 中的 tabs、caches、cacheIdsToEvict、tabIdsToEvict、components 等

---

## 修改原则

1. **不破坏对外 API**：保持 `index.ts` 已导出组件、hooks、类型的签名与行为
2. **分层**：工具放 `utils`，逻辑放 `hooks`，UI 放 `components`
3. **Nuxt**：仅改 `src/lib/nuxt/`，主库逻辑保持通用
4. **样式**：SCSS，变量和 mixins 在 `assets/style/common/`
5. **注释**：关键逻辑补充 JSDoc 或行内注释

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

# 4. 格式化检查（可选）
pnpm run format:check

# 5. 打包前全覆盖（单元 + Vue 主项目 + Nuxt 源码构建）
pnpm run test:prepack

# 6. 库构建
pnpm run lib:build

# 7. 打包后验证（Vue + Nuxt playground 使用 dist 构建）
pnpm run test:packaged
```

**本地演示：** `pnpm run dev`  
**文档预览：** `pnpm run docs:dev`

---

## 测试说明

- **单元测试**：`src/**/*.spec.ts`，Vitest，环境 `node`（部分 spec 使用 `@vitest-environment happy-dom`）
- **打包前**：`test:prepack` — 单元测试 + 主项目 build（源码）+ Nuxt playground build（USE_SOURCE=1 源码 alias）
- **打包后**：`test:packaged` — lib:build 后，vue/nuxt playground 使用 `file:../..` 引用 dist 并 build

---

## 参考文档

- 优化记录：`docs/OPTIMIZATION_TODO.md`
- 子路由分析：`docs/SUBROUTE_ANALYSIS.md`、`docs/SUBROUTE_EXPERIMENTAL.md`
- 贡献指南：`CONTRIBUTING.md`
