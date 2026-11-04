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
  moveTab,
  updateTabTitle,
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

| 属性              | 类型                     | 必填 | 说明                                                                                                          |
| ----------------- | ------------------------ | :--: | ------------------------------------------------------------------------------------------------------------- |
| id                | string                   |  否  | 页签 ID，不指定时自动生成。相同 ID 存在时为激活                                                               |
| title             | string                   |  是  | 页签名称                                                                                                      |
| path              | string                   |  是  | 跳转地址                                                                                                      |
| query             | LocationQueryRaw         |  否  | URL 参数                                                                                                      |
| closable          | boolean                  |  否  | 是否可关闭，默认 true                                                                                         |
| refreshable       | boolean                  |  否  | 是否可刷新，默认 true                                                                                         |
| iframe            | boolean                  |  否  | 是否 iframe 打开                                                                                              |
| iframeRefreshMode | 'postMessage' / 'reload' |  否  | iframe 刷新方式：postMessage=内页自行刷新（动画正常），reload=强制重载；同源默认 postMessage，跨域默认 reload |

> `openTab()` 采用「占位页签 + 加载态」：页签会在导航前同步创建（`pending`），目标页面
> chunk 下载完成后再补进页面栈；占位期间内容区显示库内置 loading，可用
> [`#pageLoading` 插槽](../advance/slot.md)替换。导航失败会自动移除占位页签并恢复原激活标签，
> 占位标签也不会写入 sessionStorage。

## 关闭

| 方法             | 说明                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------- |
| `closeTab(id)`   | 关闭指定标签，返回新激活的标签 ID（ID 不存在时返回空字符串，标签不可关闭时返回原 ID） |
| `closeAllTabs()` | 关闭所有可关闭标签（`closable: false` 的页签保留）                                    |

> 关闭左侧/右侧/其他为标签栏右键菜单专属操作，在 TabHeader/ContextMenu 内部通过 useTabPanel 使用。

## 刷新

| 方法               | 说明                                   |
| ------------------ | -------------------------------------- |
| `refreshTab(id)`   | 刷新指定标签当前页；标签不可刷新时忽略 |
| `refreshAllTabs()` | 刷新所有可刷新的标签                   |

## 其他

| 方法                              | 说明                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `activeTab(id, isRoute?)`         | 激活指定标签；传 `isRoute=false` 时只切换标签、不跳转路由                      |
| `updateTabTitle(id, title)`       | 运行时修改页签标题（同时刷新会话与当前标签的 `__tab`）；标签不存在时返回 false |
| `moveTab(id, targetIndex)`        | 将标签移动到指定索引；标签栏也支持鼠标拖放排序                                 |
| `reset()`                         | 关闭所有可关闭标签并重置状态                                                   |
| `tabs`                            | 标签列表（只读）                                                               |
| `setIFramePath(path)`             | 设置 iframe 路由路径（内部用）                                                 |
| `getWrapper({ tabId?, pageId? })` | 获取内容区 DOM；不传参数兼容返回首个容器，多标签时应传 `tabId` 或 `pageId`。   |
| `openInNewWindow(id)`             | iframe 标签在新窗口打开（无法嵌入时降级）                                      |
