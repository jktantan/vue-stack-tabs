# 文档开发快速上手

## 一条命令启动

```bash
pnpm run docs:dev
```

它会并行启动两个 dev server：

| 服务     | 地址                                            | 说明                       |
| -------- | ----------------------------------------------- | -------------------------- |
| 文档站   | http://localhost:18081/vue-stack-tabs/          | VitePress                  |
| 演示应用 | http://localhost:18080/vue-stack-tabs/demo-app/ | `docs/.vitepress/demo-app` |

文档中的 `<DemoPreview />` 以 iframe 指向演示应用（开发环境指向 18080 端口）。

只想跑其中一个：

::: code-group

```bash [只跑文档]
pnpm run docs:dev:docs
```

```bash [只跑演示应用]
pnpm run docs:dev:demo
```

:::

只跑文档时，演示区域会显示「演示应用未就绪」的兜底提示——这是预期行为。

## 演示应用

演示是一个独立的 Vue 3 应用，直接引用 `src/lib` 源码，改库代码会热更新。结构与端口约定见 `docs/.vitepress/EMBEDDED_DEMO.md`。

## 构建与预览

```bash
# 构建文档 + 演示应用（输出到 docs/.vitepress/dist）
pnpm run docs:build

# 预览构建产物
pnpm exec vitepress preview docs
```

## 目录速览

| 路径                                     | 内容                                       |
| ---------------------------------------- | ------------------------------------------ |
| `docs/index.md`、`docs/zh/index.md`      | 中英文首页（hero、features 与接入说明）    |
| `docs/base`、`docs/advance`、`docs/more` | 英文文档                                   |
| `docs/zh/**`                             | 中文文档                                   |
| `docs/.vitepress/demo-app`               | 独立演示应用                               |
| `docs/.vitepress/theme`                  | 主题扩展：`DemoPreview`、`StackHero`、样式 |

## 其他命令

```bash
# 清理占用端口（如需要）
pnpm run clean:ports
```
