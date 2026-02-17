# 子路由功能（试验性）

> **状态**：前瞻性 / 试验性功能，当前用于验证多级子路径的缓存与栈式导航，API 与行为可能在后续版本调整。

## 概述

子路由允许在单个标签内使用 Vue Router 的 `children` 配置，父组件通过 `<router-view>` 渲染子级，配合 `useTabRouter` 的 `forward`/`backward` 实现多级栈式导航。每一级路径都有独立的 keep-alive 缓存。

## 演示

在 demo 应用中：

1. 点击侧边栏 **「子路由 (试验)」** 打开子路由示例标签
2. 在标签内点击「概览 / 详情 / 详情 d1」切换子路径
3. 切换其他标签再切回，验证子路由缓存是否保留
4. 关闭标签，验证多级子路由缓存一并驱逐

## 实现要点

### 路由配置

```js
{
  path: 'subroute',
  component: () => import('@/views/demo/subroute/Test2Layout.vue'),
  children: [
    { path: '', component: () => import('@/views/demo/subroute/Test2SubHome.vue') },
    { path: 'detail', component: () => import('@/views/demo/subroute/Test2SubDetail.vue') },
    { path: 'detail/:id', component: () => import('@/views/demo/subroute/Test2SubDetail.vue') }
  ]
}
```

### 父组件

```vue
<template>
  <div>
    <nav><!-- 使用 forward() 跳转子路径 --></nav>
    <router-view />
  </div>
</template>
```

### 子组件

在子页面中按需使用 `useTabRouter().forward()` / `backward()` 进行标签内导航。

## 缓存与驱逐

- **切换标签**：不影响其他标签的子路由缓存
- **关闭标签**：该标签下所有子路由缓存一并驱逐（`markTabPagesForEviction`）
- **backward**：仅驱逐被 pop 的那一级

详见 [SUBROUTE_ANALYSIS.md](./SUBROUTE_ANALYSIS.md)。
