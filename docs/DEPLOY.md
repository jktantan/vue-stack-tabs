# 文档部署说明

## GitHub Pages 部署（自动）

仓库内置了 workflow：`.github/workflows/deploy-docs.yml`。推送到 `main`（或在 Actions 页面手动触发 `workflow_dispatch`）后，它会：

1. 安装依赖（`pnpm install --no-frozen-lockfile`）
2. 跑质量门禁：`pnpm run type-check`、`pnpm run test`（不通过则不部署）
3. 构建文档与演示应用：`pnpm run docs:build`
4. 上传 `docs/.vitepress/dist`，并用官方 Pages Actions 发布

**首次使用需要在仓库设置里启用一次**：

- Settings → Pages → **Source: GitHub Actions**

站点地址：`https://<owner>.github.io/vue-stack-tabs/`

### Base 路径

- 当前 `base`：`/vue-stack-tabs/`，对应项目站点 `https://username.github.io/vue-stack-tabs/`
- 若改用自定义域名或用户站点（`https://username.github.io/`），需要同步修改：
  - `docs/.vitepress/config.ts` 顶部的 `base` 常量
  - `vite.config.docs-demo.ts` 的 `DEMO_BASE`（也可用环境变量 `DOCS_DEMO_BASE` 覆盖）

### 构建产物

```bash
pnpm run docs:build
```

`docs/.vitepress/dist/` 中包含：

- 文档站点（根目录与 `/zh/`）
- 演示应用（`demo-app/`）

### 手动部署（备用）

不想用 Actions 时，也可以自行构建后按分支方式部署（此时 Pages 的 Source 要设为 "Deploy from a branch"）：

```bash
pnpm run docs:build

cd docs/.vitepress/dist
git init
git add -A
git commit -m 'deploy'
git push -f git@github.com:<owner>/vue-stack-tabs.git main:gh-pages
cd -
```

### 验证部署

- 文档首页：`https://username.github.io/vue-stack-tabs/`
- 中文文档：`https://username.github.io/vue-stack-tabs/zh/`
- 演示页（文档中内嵌的 iframe）：`https://username.github.io/vue-stack-tabs/demo.html`
- 演示应用（独立打开）：`https://username.github.io/vue-stack-tabs/demo-app/`

### 演示（Demo）工作原理

- **开发环境**：`pnpm run docs:dev` 会并行启动文档（5173）与演示应用（5174）；文档中的 `<DemoPreview />` 以 iframe 指向演示应用
- **生产环境**：`docs:build` 先构建文档，再把演示应用构建到 `docs/.vitepress/dist/demo-app/`，部署后 iframe 指向 `{base}demo-app/`

实现细节见 `docs/.vitepress/EMBEDDED_DEMO.md`。

## 本地预览

```bash
# 构建（含演示应用）
pnpm run docs:build

# 用 VitePress 自带预览（会正确处理 base 路径）
pnpm exec vitepress preview docs
```

也可以在 `docs/.vitepress/dist` 下起任意静态服务器，注意访问时要带上 base 路径（`http://localhost:8080/vue-stack-tabs/`）。

## 注意事项

1. **Base 路径必须匹配**：VitePress 的 `base`、演示应用的 `DEMO_BASE` 与部署地址三者要一致
2. **演示应用使用 hash 路由**：静态托管没有 history fallback，hash 能保证在 iframe 内刷新任意路径都可用（详见 `docs/.vitepress/EMBEDDED_DEMO.md`）
3. **依赖可重现性**：仓库未提交 `pnpm-lock.yaml`（见 `.gitignore`），因此 CI 用 `pnpm install --no-frozen-lockfile`，缓存 key 基于 `package.json`。若希望构建完全可重现并让缓存更精确，建议把 `pnpm-lock.yaml` 纳入版本控制
4. **子路由功能**：演示中的子路由为试验性功能，已在文档中说明
