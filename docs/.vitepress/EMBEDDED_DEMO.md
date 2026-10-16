# 嵌入式 Demo 架构说明

## 概述

vue-stack-tabs 的文档 Demo 现在完全嵌入在 VitePress 中，无需单独的服务器或 iframe。

## 架构

### 1. VitePress 主题扩展

```typescript
// docs/.vitepress/theme/index.ts
import VueStackTabs from 'vue-stack-tabs'
import { createRouter, createMemoryHistory } from 'vue-router'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 创建内存路由用于 Demo 页面
    const demoRouter = createRouter({
      history: createMemoryHistory(),
      routes: demoRoutes
    })

    // 注册插件
    app.use(demoRouter)
    app.use(VueStackTabs, [...config])

    // 注册组件
    app.component('FullDemo', FullDemo)
  }
}
```

### 2. Demo 组件结构

```
docs/.vitepress/theme/
├── components/
│   ├── FullDemo.vue              # 主 Demo 容器
│   └── demo-pages/               # Demo 页面
│       ├── DemoHome.vue          # 首页
│       ├── DemoAbout.vue         # 关于
│       ├── DemoContact.vue       # 联系
│       ├── DemoPage.vue          # 通用页面
│       ├── DemoScroll.vue        # 滚动演示
│       ├── DemoForm.vue          # 表单演示
│       ├── DemoNested.vue        # 嵌套路由
│       └── DemoDynamic.vue       # 动态标签
├── demo-routes.ts                # Demo 路由配置
└── index.ts                      # 主题入口
```

### 3. 在 Markdown 中使用

```md
# Demo 页面

<FullDemo />
```

## 优势

### ✅ 简化部署

- 只需要一个 VitePress 服务
- 无需管理多个端口
- 无需 iframe 跨域处理

### ✅ 更好的性能

- 无 iframe 开销
- 直接 Vue 组件渲染
- 共享应用状态

### ✅ 开发体验

- 热模块替换（HMR）
- 统一的开发服务器
- 更简单的调试

### ✅ 用户体验

- 无需等待多个服务启动
- 更快的加载速度
- 更流畅的交互

## Demo 功能

### 基础功能

- 🏠 不可关闭的默认标签
- 📄 可关闭的普通标签
- 📑 批量打开多个标签

### 高级功能

- 📜 **滚动位置记忆**: 50 个区块演示自动保存滚动位置
- 📝 **表单状态保持**: 完整表单演示状态持久化
- 🔗 **嵌套路由**: 标签内的路由导航
- 🎲 **动态标签**: 运行时创建唯一标签

### 交互操作

- 按钮式控制面板
- 右键菜单（关闭左侧/右侧/其他/全部）
- 刷新标签功能

## 技术细节

### 路由处理

使用 `createMemoryHistory()` 而不是 `createWebHistory()`，避免与 VitePress 的路由冲突：

```typescript
const demoRouter = createRouter({
  history: createMemoryHistory(), // ✅ 内存路由
  routes: demoRoutes
})
```

### 状态管理

Demo 页面的状态通过 Vue 的响应式系统自然保持：

- 表单输入：使用 `ref()` 绑定
- 滚动位置：由 VueStackTabs 自动管理
- 路由状态：由内存路由管理

### 样式隔离

每个 Demo 页面使用 `scoped` 样式，避免污染文档：

```vue
<style scoped>
.demo-page {
  /* 样式 */
}
</style>
```

## 开发指南

### 添加新的 Demo 页面

1. 创建组件：`docs/.vitepress/theme/components/demo-pages/DemoNew.vue`
2. 添加路由：`docs/.vitepress/theme/demo-routes.ts`
3. 在 `FullDemo.vue` 中添加按钮

### 修改 Demo 样式

编辑对应的 `.vue` 文件，修改会自动热更新。

### 调试

使用浏览器开发者工具，Demo 组件就像普通的 Vue 组件一样可调试。

## 部署

构建时 Demo 会自动包含在文档中：

```bash
pnpm run docs:build
```

输出：`docs/.vitepress/dist/` - 包含文档和嵌入的 Demo
