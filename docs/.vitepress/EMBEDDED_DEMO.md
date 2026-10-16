# 演示（Demo）架构说明

文档里的在线演示**不是一个 Vue 组件**，而是用一个 iframe 包住的**独立应用**。

## 为什么用 iframe

`vue-stack-tabs` 把每个标签栈绑定到浏览器 URL，并且会在运行期驱动 `vue-router`。如果把它直接挂在文档站里，就会和 VitePress 争用同一个 router。

早期版本把演示组件直接内嵌进 VitePress（`createMemoryHistory` + `app.use(VueStackTabs)`），需要给文档站塞一个内存路由来回避冲突，还让文档站被迫加载整个库；那套文件后来与库 API 脱节、已经无法运行，现已整体移除。

现在的做法：演示应用自己是一个完整应用（自己的 router、自己的 URL），文档只用一个 iframe 指向它。两边路由互不干预，演示里的行为就是真实业务应用里的行为。

## 结构

```
docs/.vitepress/
├── demo-app/                      # 独立演示应用（vite root）
│   ├── index.html
│   ├── public/
│   │   └── iframe-child.html      # iframe 标签的演示页（原生 postMessage 桥）
│   └── src/
│       ├── main.ts                # 挂载 Vue app 并 app.use(VueStackTabs)
│       ├── App.vue                # <router-view />
│       ├── Shell.vue              # <VueStackTabs> + 演示控制台
│       ├── router.ts              # 真实路由（含 /iframe 占位路由）
│       ├── styles.css             # 演示应用样式（品牌色与文档站一致）
│       └── pages/                 # 各演示页面
└── theme/
    ├── DemoPreview.vue            # iframe 包装，文档里写 <DemoPreview />
    ├── demo-preview.css
    └── components/StackHero.vue    # 首页 hero 的「标签栈」示意（与演示无关）
```

## 命令

| 命令                     | 作用                                                            |
| ------------------------ | --------------------------------------------------------------- |
| `pnpm run docs:dev`      | 并行启动文档（5173）与演示应用（5174）的 dev server             |
| `pnpm run docs:dev:docs` | 只启动文档                                                      |
| `pnpm run docs:dev:demo` | 只启动演示应用                                                  |
| `pnpm run docs:build`    | 先构建文档，再把演示应用构建到 `docs/.vitepress/dist/demo-app/` |

## 在文档里使用

```md
<DemoPreview height="660px" title="在线演示" />
```

| Prop     | 默认值                    | 说明                                                  |
| -------- | ------------------------- | ----------------------------------------------------- |
| `path`   | `''`                      | 演示应用内的路由路径（hash 路由），留空则落到演示首页 |
| `title`  | `vue-stack-tabs 在线演示` | 标题栏文字                                            |
| `height` | `620px`                   | iframe 高度                                           |

## 端口与路径约定

- 演示应用 base：`/vue-stack-tabs/demo-app/`（`vite.config.docs-demo.ts` 的 `DEMO_BASE`，可用环境变量覆盖）
- dev 端口：`5174`（与 `DemoPreview.vue` 的 `DEV_DEMO_ORIGIN` 一致）
- 生产路径：`{vitepress base}demo-app/`

⚠️ 路径**不要**用 `demo/`：文档站的 `docs/demo.md` 会生成 `demo.html`，静态服务器对 `/demo/` 会优先命中文档页，导致 iframe 里套娃加载自己（已踩过）。

演示应用使用 **hash 路由**：站点部署在静态托管上，无法为 `{base}demo-app/xxx` 提供 history fallback，hash 能保证在 iframe 内刷新任意路径都可用。

改端口或 base 时，`vite.config.docs-demo.ts` 与 `DemoPreview.vue` 必须同步修改。

## 新增一个演示页面

1. 在 `docs/.vitepress/demo-app/src/pages/` 新建页面组件
2. 在 `docs/.vitepress/demo-app/src/router.ts` 注册路由
3. 需要入口按钮时，在 `Shell.vue` 的控制台分组、或首页页面的快捷入口里加一个 `openTab` 调用
