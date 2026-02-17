# 快速启动文档

## 一键启动

```bash
pnpm run docs:dev
```

访问：**http://localhost:5173/vue-stack-tabs/**

就这么简单！只需要运行一个命令。

## Demo 已内置

Demo 现在**直接嵌入在文档中**，无需单独的服务器或 iframe：

✅ **完整功能演示**
- 基础标签操作
- 滚动位置记忆
- 表单状态保持
- 嵌套路由导航
- 动态创建标签

✅ **即开即用**
- 只需一个 VitePress 服务
- Demo 组件直接在文档内运行
- 无需额外配置

✅ **开发友好**
- 直接引用 src/lib 源码
- 修改源码自动热更新
- 完整 TypeScript 支持

## 架构说明

Demo 通过以下方式嵌入：

1. **VitePress 主题扩展** (`docs/.vitepress/theme/index.ts`)
   - 注册 VueStackTabs 插件
   - 创建内存路由用于 Demo 页面
   - 注册 `FullDemo` 组件

2. **Demo 组件** (`docs/.vitepress/theme/components/`)
   - `FullDemo.vue`: 主 Demo 容器
   - `demo-pages/*.vue`: 各功能演示页面

3. **直接在 Markdown 中使用**
   ```md
   <FullDemo />
   ```

## 其他命令

```bash
# 构建文档
pnpm run docs:build

# 预览构建
pnpm run docs:preview

# 清理端口（如需要）
pnpm run clean:ports
```
