# iframe 与父窗口通信

## 概述

iframe 内的页面可与父窗口的 vue-stack-tabs 通信，实现：

- **打开新标签**：iframe 内调用 `postOpenTab`，由父窗口打开新标签
- **接收刷新指令**：父窗口发起刷新时，向 iframe 发送 postMessage，iframe 内监听并自行刷新

## 安装

iframe 内页面需与主应用同源，或主应用将 iframe 的 origin 加入 `iframeAllowedOrigins`。

建议从无样式副作用的子入口 `vue-stack-tabs/iframe-bridge` 引入桥接工具，避免 iframe 页面加载整库样式：

```typescript
import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'
```

## 打开新标签

```typescript
postOpenTab({
  title: '新页面',
  path: '/demo/detail',
  query: { id: '123' },
  closable: true,
  refreshable: true
})
```

跨域父页面必须显式传入 `targetOrigin`（默认使用 iframe 页面自身的 `window.location.origin`）：

```typescript
import { postOpenTab } from 'vue-stack-tabs/iframe-bridge'

postOpenTab({ title: '新页面', path: '/detail' }, { targetOrigin: 'https://app.example.com' })
```

主应用需配置 `iframeAllowedOrigins`（若 iframe 与主应用不同源）：

```vue
<vue-stack-tabs
  iframe-path="/iframe"
  :iframe-allowed-origins="['https://your-iframe-origin.com']"
/>
```

## 接收刷新指令

默认情况下，刷新使用 `postMessage` 模式：父窗口向 iframe 发送 `vue-stack-tabs:refresh`，iframe 内需监听并执行刷新。

```typescript
import { onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

// 页面加载时注册，收到刷新指令时执行 location.reload()
const unlisten = onRefreshRequest()

// 组件卸载时取消监听
onUnmounted(unlisten)
```

自定义刷新逻辑：

```typescript
onRefreshRequest(() => {
  // 自定义逻辑，如路由刷新
  router.go(0)
  // 或 location.reload()
})
```

::: warning 安全提示
默认情况下 `onRefreshRequest` **不校验** `MessageEvent.origin`，任何嵌入此 iframe 的父页面都能触发刷新回调，等同 `targetOrigin: '*'`，仅适合本地调试。

生产环境请**务必显式传入 `allowedOrigins`**：

```typescript
onRefreshRequest(undefined, {
  allowedOrigins: ['https://app.example.com']
})
```

:::

## 跨域 iframe 使用 reload 模式

若 iframe 为跨域且无法修改其代码，可指定 `iframeRefreshMode: 'reload'`，刷新时直接重载 iframe：

```typescript
openTab({
  id: 'ext',
  title: '外部页面',
  path: 'https://example.com',
  iframe: true,
  iframeRefreshMode: 'reload'
})
```

## API 参考

| 方法                                    | 说明                       |
| --------------------------------------- | -------------------------- |
| `postOpenTab(payload, options?)`        | 向父窗口请求打开新标签     |
| `onRefreshRequest(callback?, options?)` | 注册刷新监听，返回取消函数 |
| `MSG_REFRESH`                           | 刷新消息类型常量           |
| `MSG_OPEN_TAB`                          | 打开标签消息类型常量       |
