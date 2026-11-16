# Installation

::: warning
Vue Stack Tabs is **ESM-only** and targets modern toolchains. Use **Node.js `^20.19.0 || >=22.12.0`** — older versions are no longer supported (the build toolchain runs on Vite 8).
:::

## Peer Dependencies

Vue, Vue Router and Nuxt are peer dependencies, so make sure your app already depends on them:

| Package      | Version              | Required | Notes                                            |
| ------------ | -------------------- | -------- | ------------------------------------------------ |
| `vue`        | `^3.5.43`            | yes      |                                                  |
| `vue-router` | `^5.4.0`             | yes      |                                                  |
| `nuxt`       | `^3.0.0 \|\| ^4.0.0` | no       | only for the Nuxt module (`vue-stack-tabs/nuxt`) |

## Package Manager

We recommend using **pnpm**:

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

## Import the Stylesheet

Styles ship as a separate CSS file and are **not** imported automatically. Import it once in your app entry:

```ts
// main.ts
import 'vue-stack-tabs/dist/style.css'
```

## Entry Points

| Import path                     | Contents                                                         |
| ------------------------------- | ---------------------------------------------------------------- |
| `vue-stack-tabs`                | Components, composables, iframe bridge helpers and all types     |
| `vue-stack-tabs/nuxt`           | Nuxt module — `modules: ['vue-stack-tabs/nuxt']`                 |
| `vue-stack-tabs/iframe-bridge`  | `postOpenTab`, `onRefreshRequest`, `MSG_REFRESH`, `MSG_OPEN_TAB` |
| `vue-stack-tabs/dist/style.css` | The stylesheet                                                   |

## ESM-only

There is no CommonJS build: `require('vue-stack-tabs')` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Use `import` (or `await import()`) from ESM code — Vite, Rollup, webpack 5 and Nuxt all resolve the ESM entry automatically.

## Build from Source

To use the latest dev version, clone from GitHub or Gitee and build locally:

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

Something not working? See [Troubleshooting](./troubleshooting.md).
