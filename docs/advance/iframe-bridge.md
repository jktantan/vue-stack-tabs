# iframe & Parent Communication

## Overview

Pages inside an iframe can communicate with the parent's vue-stack-tabs:

- **Open new tab**: Call `postOpenTab` inside the iframe; the parent opens the tab.
- **Refresh**: The parent sends a postMessage refresh request; the iframe listens and reloads.

## Setup

The iframe page must be same-origin, or the parent must add the iframe origin to `iframeAllowedOrigins`.

## Open New Tab

```typescript
import { postOpenTab } from 'vue-stack-tabs'

postOpenTab({
  title: 'New Page',
  path: '/demo/detail',
  query: { id: '123' },
  closable: true,
  refreshable: true
})
```

If the iframe is cross-origin, configure `iframeAllowedOrigins`:

```vue
<vue-stack-tabs
  iframe-path="/iframe"
  :iframe-allowed-origins="['https://your-iframe-origin.com']"
/>
```

## Handle Refresh

By default, refresh uses postMessage: the parent sends `vue-stack-tabs:refresh`; the iframe listens and reloads.

```typescript
import { onRefreshRequest } from 'vue-stack-tabs'

const unlisten = onRefreshRequest()

onUnmounted(unlisten)
```

Custom refresh logic:

```typescript
onRefreshRequest(() => {
  router.go(0)
  // or location.reload()
})
```

## Cross-Origin: reload Mode

For cross-origin iframes you cannot modify, use `iframeRefreshMode: 'reload'`:

```typescript
openTab({
  id: 'ext',
  title: 'External',
  path: 'https://example.com',
  iframe: true,
  iframeRefreshMode: 'reload'
})
```

## API Reference

| Method | Description |
|--------|-------------|
| `postOpenTab(payload)` | Request parent to open a new tab |
| `onRefreshRequest(callback?)` | Register refresh listener; returns unsubscribe |
| `MSG_REFRESH` | Refresh message type constant |
| `MSG_OPEN_TAB` | Open tab message type constant |
