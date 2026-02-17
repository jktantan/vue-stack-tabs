# useTabActions

标签操作 Hook，整合打开、关闭、刷新等操作。

```typescript
import { useTabActions } from 'vue-stack-tabs'

const {
  openTab,
  closeTab,
  closeAllTabs,
  refreshTab,
  refreshAllTabs,
  activeTab,
  reset,
  tabs,
  setIFramePath,
  getWrapper,
  openInNewWindow
} = useTabActions()
```

## 打开

### openTab

打开新标签。存在同 id 标签时激活并显示最后页面；`renew=true` 时清空栈并跳转到新地址。

**调用：** `openTab(tab: ITabData, renew?: boolean)`

| 属性        | 类型                   | 必填 | 说明                                            |
| ----------- | ---------------------- | :--: | ----------------------------------------------- |
| id          | string                 |  否  | 页签 ID，不指定时自动生成。相同 ID 存在时为激活 |
| title       | string                 |  是  | 页签名称                                        |
| path        | string                 |  是  | 跳转地址                                        |
| query       | Record<string, string> |  否  | URL 参数                                        |
| closable    | boolean                |  否  | 是否可关闭，默认 true                           |
| refreshable | boolean                |  否  | 是否可刷新，默认 true                           |
| iframe      | boolean                |  否  | 是否 iframe 打开                                |
| iframeRefreshMode | 'postMessage' / 'reload' | 否 | iframe 刷新方式：postMessage=内页自行刷新（动画正常），reload=强制重载，默认 postMessage |

## 关闭

| 方法             | 说明         |
| ---------------- | ------------ |
| `closeTab(id)`   | 关闭指定标签 |
| `closeAllTabs()` | 关闭所有标签 |

> 关闭左侧/右侧/其他为标签栏右键菜单专属操作，在 TabHeader/ContextMenu 内部通过 useTabPanel 使用。

## 刷新

| 方法               | 说明               |
| ------------------ | ------------------ |
| `refreshTab(id)`   | 刷新指定标签当前页 |
| `refreshAllTabs()` | 刷新所有标签       |

## 其他

| 方法                      | 说明                           |
| ------------------------- | ------------------------------ |
| `activeTab(id, isRoute?)` | 激活指定标签                   |
| `reset()`                 | 重置                           |
| `tabs`                    | 标签列表（只读）               |
| `setIFramePath(path)`     | 设置 iframe 路由路径（内部用） |
| `getWrapper()`            | 获取内容区 DOM（内部用）       |
| `openInNewWindow(id)`     | iframe 标签在新窗口打开（无法嵌入时降级） |
