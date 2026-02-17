# Playgrounds

用于验证 `vue-stack-tabs` 在 Vue 与 Nuxt 下的构建与运行。

## 打包前验证（使用源码）

```bash
pnpm run test:prepack
```

包含：1) 单元测试；2) Vue 主项目构建（`@/lib` 源码）；3) Nuxt playground 构建（`USE_SOURCE=1` 时使用源码 alias）。

## 打包后验证（使用 dist）

```bash
pnpm run test:packaged
```

该命令会：1) 构建 lib 到 `dist/`；2) 在 `vue` 和 `nuxt` 两个 playground 中安装依赖并执行 `pnpm run build`。

## 单独运行

```bash
# Vue playground（需先 lib:build）
cd playgrounds/vue && pnpm install && pnpm run dev

# Nuxt playground（打包后）
cd playgrounds/nuxt && pnpm install && pnpm run dev

# Nuxt 源码模式（打包前）
cd playgrounds/nuxt && USE_SOURCE=1 pnpm run build:source
```
