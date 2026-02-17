# useTabActions

Hook for tab operations: open, close, refresh, etc.

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

## openTab

Opens a new tab. If a tab with the same id exists, it is activated and the last page is shown. With `renew=true`, the stack is cleared and the tab is reopened.

**Call:** `openTab(tab: ITabData, renew?: boolean)`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | No | Tab id; auto-generated if omitted. Same id = activate existing tab |
| title | string | Yes | Tab title |
| path | string | Yes | Route path or iframe URL |
| query | Record<string, string> | No | Query params |
| closable | boolean | No | Can close; default true |
| refreshable | boolean | No | Can refresh; default true |
| iframe | boolean | No | Open as iframe |
| iframeRefreshMode | 'postMessage' / 'reload' | No | iframe refresh mode; default postMessage |

## Close

| Method | Description |
|--------|-------------|
| `closeTab(id)` | Close specific tab |
| `closeAllTabs()` | Close all tabs |

Close left/right/others are available via the right-click context menu.

## Refresh

| Method | Description |
|--------|-------------|
| `refreshTab(id)` | Refresh current page of tab |
| `refreshAllTabs()` | Refresh all tabs |

## Other

| Method | Description |
|--------|-------------|
| `activeTab(id, isRoute?)` | Activate tab |
| `reset()` | Reset all |
| `tabs` | Tab list (read-only) |
| `setIFramePath(path)` | Set iframe path (internal) |
| `getWrapper()` | Get content DOM (internal) |
| `openInNewWindow(id)` | Open iframe tab in new window (fallback) |
