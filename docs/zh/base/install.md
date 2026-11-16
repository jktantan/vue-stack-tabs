# 安装

::: warning
本库为 **ESM-only**，面向现代工具链。请使用 **Node.js `^20.19.0 || >=22.12.0`**，旧版本不再支持（构建工具链基于 Vite 8）。
:::

## 对等依赖

Vue、Vue Router 与 Nuxt 属于对等依赖（peerDependencies），请先确保你的应用已安装：

| 依赖         | 版本                 | 是否必需 | 说明                                      |
| ------------ | -------------------- | -------- | ----------------------------------------- |
| `vue`        | `^3.5.43`            | 是       |                                           |
| `vue-router` | `^5.4.0`             | 是       |                                           |
| `nuxt`       | `^3.0.0 \|\| ^4.0.0` | 否       | 仅 Nuxt 模块需要（`vue-stack-tabs/nuxt`） |

## 安装方式

推荐使用 **pnpm** 的方式安装

::: code-group

```bash [pnpm]
pnpm add vue-stack-tabs
```

```bash [npm]
npm install vue-stack-tabs
```

```bash [yarn]
yarn add vue-stack-tabs
```

:::

## 引入样式

样式以独立的 CSS 文件发布，**不会**被自动注入，请在应用入口引入一次：

```ts
// main.ts
import 'vue-stack-tabs/dist/style.css'
```

## 子路径入口

| 引入路径                        | 内容                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| `vue-stack-tabs`                | 组件、组合式函数、iframe 通信工具与全部类型                      |
| `vue-stack-tabs/nuxt`           | Nuxt 模块 —— `modules: ['vue-stack-tabs/nuxt']`                  |
| `vue-stack-tabs/iframe-bridge`  | `postOpenTab`、`onRefreshRequest`、`MSG_REFRESH`、`MSG_OPEN_TAB` |
| `vue-stack-tabs/dist/style.css` | 样式文件                                                         |

## 仅 ESM

本库没有 CommonJS 入口，`require('vue-stack-tabs')` 会抛出 `ERR_PACKAGE_PATH_NOT_EXPORTED`。请在 ESM 代码中使用 `import`（或 `await import()`）—— Vite、Rollup、webpack 5 与 Nuxt 都会自动解析 ESM 入口。

## 构建开发版

如果你想使用最新的开发版，就得从 **GitHub** 或 **Gitee** 上直接 clone，然后自己 build 一个 `vue-stack-tabs`。

::: code-group

```bash [GitHub]
git clone https://github.com/jktantan/vue-stack-tabs.git
cd vue-stack-tabs
pnpm install
pnpm run lib:build
```

```bash [Gitee]
git clone https://gitee.com/jktantan/vue-stack-tabs.git
cd vue-stack-tabs
pnpm install
pnpm run lib:build
```

:::

遇到问题？请看[常见问题](./troubleshooting.md)。
