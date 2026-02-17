# 文档部署说明

## GitHub Pages 部署

本项目文档使用 VitePress 构建，并集成了 Demo 演示应用。

### 构建

```bash
pnpm run docs:build
```

构建产物位于 `docs/.vitepress/dist/`，包含：
- 文档站点（根目录和 `/zh/`）
- Demo 应用（`/demo/` 目录）

### GitHub Pages 配置

1. **仓库设置**
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `main` (根据你的部署分支)
   - Folder: `/docs/.vitepress/dist` 或根目录（如果将 dist 内容推送到根）

2. **Base 路径**
   - 当前配置：`base: '/vue-stack-tabs/'`
   - 适用于项目站点：`https://username.github.io/vue-stack-tabs/`
   - 如果使用自定义域名或用户站点（`https://username.github.io/`），需修改：
     - `docs/.vitepress/config.ts` 中的 `base: '/'`
     - `vite.config.docs-demo.ts` 中的 `DEMO_BASE` 或环境变量

### 部署流程

#### 方式一：手动部署

```bash
# 1. 构建
pnpm run docs:build

# 2. 进入构建产物目录
cd docs/.vitepress/dist

# 3. 初始化 git（如果是首次）
git init
git add -A
git commit -m 'deploy'

# 4. 推送到 gh-pages 分支
git push -f git@github.com:username/vue-stack-tabs.git main:gh-pages

cd -
```

#### 方式二：GitHub Actions

创建 `.github/workflows/deploy-docs.yml`：

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 10
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build docs
        run: pnpm run docs:build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/.vitepress/dist
```

### Demo 工作原理

- **开发环境**：`pnpm run docs:dev` 只启动文档，Demo iframe 指向 `localhost:5173`（需单独运行 `pnpm dev`）
- **生产环境**：Demo 已构建到 `/demo/` 目录，iframe 直接加载部署后的 Demo

### 验证部署

部署后访问：
- 文档首页：`https://username.github.io/vue-stack-tabs/`
- 中文文档：`https://username.github.io/vue-stack-tabs/zh/`
- Demo 页面：`https://username.github.io/vue-stack-tabs/demo.html`
- Demo 应用：`https://username.github.io/vue-stack-tabs/demo/demo`

## 本地预览

查看构建后的效果：

```bash
# 构建
pnpm run docs:build

# 预览（需要静态服务器）
cd docs/.vitepress/dist
npx serve

# 或使用 Python
python -m http.server 8080

# 或使用 Vite
vite preview --outDir docs/.vitepress/dist
```

访问 `http://localhost:8080/vue-stack-tabs/`（注意 base 路径）

## 注意事项

1. **Base 路径必须匹配**：VitePress config 和 Demo config 的 base 必须一致
2. **SPA 路由**：Demo 使用 Vue Router history 模式，`demo/demo/` 目录下有 `index.html` 副本以支持直接访问
3. **资源路径**：所有资源使用绝对路径（以 `/vue-stack-tabs/` 开头）
4. **子路由功能**：Demo 中的子路由为试验性功能，已在文档中说明
