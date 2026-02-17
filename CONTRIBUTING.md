# 贡献指南

感谢你对 vue-stack-tabs 的兴趣！本文档说明如何参与开发、修改和测试。

---

## 环境要求

- **Node.js** 18+
- **pnpm** 10+

```bash
pnpm install
```

---

## 项目简介

vue-stack-tabs 是一个 **Vue 3 多标签页管理库**，与 Vue Router 集成，支持：

- 路由级标签页、iframe 标签页
- 标签的增删、刷新、批量关闭（全部/左侧/右侧/其他）
- 标签内前进/后退（栈式导航）
- 滚动位置记忆、会话恢复
- Nuxt 3/4 模块

适用场景：后台管理、多页签工作台等。

---

## 用户快速开始

### Vue 项目

```bash
pnpm add vue-stack-tabs
```

```ts
// main.ts
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'
app.use(VueStackTabs)
```

```vue
<template>
  <vue-stack-tabs iframe-path="/iframe" />
</template>
```

需在路由中配置 iframe 路径对应路由，详见 [README](./README.md) 或 `docs/zh/base/introduction.md`。

### Nuxt 项目

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: { locale: 'zh-CN' }
})
```

详见 [README](./README.md) 或 `docs/zh/base/nuxt.md`。

---

## 开发目录结构

```
├── src/
│   ├── lib/                 # 核心库（发布内容）
│   │   ├── index.ts         # 入口与导出
│   │   ├── hooks/           # useTabPanel、useTabActions、useTabRouter 等
│   │   ├── hooks/tabPanel/  # state、evict、scroll、session
│   │   ├── components/      # TabHeader、ContextMenu、PageLoading
│   │   ├── utils/           # tabInfoEncoder、urlParser、scrollUtils、iframeBridge
│   │   ├── model/           # TabModel、Stack
│   │   ├── nuxt/            # Nuxt 模块
│   │   └── assets/style/    # SCSS 样式
│   ├── router/              # 示例路由
│   ├── views/               # 示例页面
│   └── components/          # 示例布局
├── playgrounds/             # 验证用
│   ├── vue/                 # Vue + dist 构建验证
│   └── nuxt/                # Nuxt + dist 构建验证
├── scripts/                 # 验证脚本
├── docs/                    # VitePress 文档
└── dist/                    # 构建输出（lib:build）
```

---

## 核心概念

| 概念 | 说明 |
|------|------|
| `useTabPanel` | 内部核心 hook，管理 tabs、caches、components、驱逐、滚动等 |
| `useTabActions` | 对外 hook，提供 openTab、closeTab、refreshTab、activeTab 等 |
| `useTabRouter` | 对外 hook，在标签内页面使用，提供 forward、backward、addScrollTarget |
| `createPageId` | tabId + path + query 生成 keep-alive 缓存 ID |
| iframe 路由 | 渲染 iframe 标签页的占位路由，需与 `iframe-path` 一致 |

---

## 开发与修改规范

1. **新增功能**：优先在 `hooks/` 实现逻辑，再在 `components/` 接入 UI
2. **工具函数**：放在 `utils/`，命名清晰
3. **样式**：使用 `assets/style/` 下 SCSS，变量和 mixins 在 `common/`
4. **不破坏对外 API**：`useTabActions`、`useTabRouter`、`useTabLoading`、`IFrame`、`VueStackTabs` 的导出名和签名保持兼容
5. **代码风格**：遵循 ESLint + Prettier 配置，提交前执行 `pnpm run lint` 和 `pnpm run format:check`

---

## 测试流程

修改代码后，请依次执行：

```bash
# 1. 类型检查
pnpm run type-check

# 2. 单元测试
pnpm run test

# 3. 代码规范（自动修复）
pnpm run lint

# 4. 库构建
pnpm run lib:build
```

**完整验证（推荐）：**

```bash
# 打包前全覆盖：单元测试 + Vue 主项目 + Nuxt 源码构建
pnpm run test:prepack

# 打包后验证：Vue + Nuxt 使用 dist 构建
pnpm run test:packaged
```

全部通过后再提交。

---

## 脚本说明

| 脚本 | 说明 |
|------|------|
| `dev` | 启动示例应用（Vite） |
| `build` | 构建示例应用（含 type-check） |
| `lib:build` | 构建库到 dist/ |
| `test` | 单元测试 |
| `test:coverage` | 单元测试 + 覆盖率 |
| `test:prepack` | 打包前验证（单元 + Vue + Nuxt 源码） |
| `test:packaged` | 打包后验证（Vue + Nuxt 使用 dist） |
| `lint` | ESLint 检查并修复 |
| `format` | Prettier 格式化 |
| `docs:dev` | 文档本地预览 |

---

## 文档

- **在线文档**：`pnpm run docs:dev` 启动 VitePress 预览
- **文档源文件**：`docs/zh/`
- **分析文档**：`docs/OPTIMIZATION_TODO.md`、`docs/SUBROUTE_ANALYSIS.md`、`docs/SUBROUTE_EXPERIMENTAL.md`

---

## 提交流程

1. Fork 仓库
2. 创建分支（如 `feat/xxx`、`fix/xxx`、`docs/xxx`）
3. 修改代码，确保 `type-check`、`test`、`lint` 通过
4. 若有重大改动，建议执行 `test:prepack` 和 `test:packaged`
5. 提交 PR，描述修改内容与动机

---

## AI 助手

若为 AI 助手参与开发，请参阅 [AGENTS.md](./AGENTS.md) 获取项目结构与修改原则。
