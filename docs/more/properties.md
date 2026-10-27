# Props

| Prop                 | Description                                                                                                                                                                                                | Type                                    | Default                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| defaultTabs          | Default tabs, applied on initialization only (later prop changes are ignored)                                                                                                                              | `ITabData[]`                            | `[]`                                                                       |
| homeTab              | Pinned home tab: always first, non-closable and non-draggable; other tabs cannot move before it. Omit to keep previous behavior                                                                            | `ITabData`                              | —                                                                          |
| max                  | Max open tabs                                                                                                                                                                                              | `number`                                | `20`                                                                       |
| contextmenu          | Right-click context menu. `true` (default) = built-in menu; `false` = browser default; `IContextMenu[]` = append custom items                                                                              | `boolean \| IContextMenu[]`             | `true`                                                                     |
| pageTransition       | Forward page transition name                                                                                                                                                                               | `string`                                | `stack-tab-swap`                                                           |
| pageTransitionBack   | Backward page transition name                                                                                                                                                                              | `string`                                | `stack-tab-swap-back`                                                      |
| tabTransition        | Tab transition name. Accepts string or `TransitionProps` object                                                                                                                                            | `string \| TransitionProps`             | `stack-tab-zoom`                                                           |
| tabScrollMode        | Tab bar scroll mode                                                                                                                                                                                        | `TabScrollMode.WHEEL \| BUTTON \| BOTH` | `TabScrollMode.BOTH`                                                       |
| space                | Pixel distance scrolled per tab bar step                                                                                                                                                                   | `number`                                | `300`                                                                      |
| width                | Component width                                                                                                                                                                                            | `string`                                | `100%`                                                                     |
| height               | Component height                                                                                                                                                                                           | `string`                                | `100%`                                                                     |
| i18n                 | Locale. Built-in values: `zh-CN`, `en`                                                                                                                                                                     | `string`                                | `zh-CN`                                                                    |
| pageScroll           | Content scroll strategy: `'native'` = library wrapper native scroll; `'none'` = page-managed; `Component` = custom scroll component                                                                        | `'native' \| 'none' \| Component`       | `'none'`                                                                   |
| scrollShadow         | Render top/bottom content shadows; per-page override via `useTabScrollShadow`                                                                                                                              | `boolean`                               | `true`                                                                     |
| iframePath           | iframe route path (**required**)                                                                                                                                                                           | `string`                                | —                                                                          |
| iframeAllowedOrigins | Allowed origins for postMessage openTab, merged with the current origin                                                                                                                                    | `string[]`                              | `[]`                                                                       |
| iframeSandbox        | iframe `sandbox` attribute. The default includes `allow-same-origin`, which is unsafe for **same-origin** pages; remove it when embedding same-origin content. Intended for cross-origin third-party pages | `string`                                | `allow-scripts allow-forms allow-popups allow-downloads allow-same-origin` |
| iframeReferrerPolicy | iframe `referrerpolicy`                                                                                                                                                                                    | `ReferrerPolicy`                        | `strict-origin-when-cross-origin`                                          |
| iframeAllow          | iframe `allow` attribute (Permissions Policy)                                                                                                                                                              | `string`                                | `''`                                                                       |
| iframeLoadTimeout    | iframe load timeout (ms); shows error UI on timeout                                                                                                                                                        | `number`                                | `15000`                                                                    |
| sessionPrefix        | Prefix for sessionStorage keys; useful when hosting multiple instances on the same origin                                                                                                                  | `string`                                | `''`                                                                       |

> **Note**: `iframePath` is required. When it is missing, the component throws an Error in development and logs `console.error` in production. See [Nuxt](../base/nuxt.md) and [iframe & Parent Communication](../advance/iframe-bridge.md).

## Events

| Event          | Payload      | Description                                                                          |
| -------------- | ------------ | ------------------------------------------------------------------------------------ |
| `onActive`     | `id: string` | Fired when a tab becomes active, whether by a click or by an API call.               |
| `onPageLoaded` | —            | Fired when the page inside a tab mounts or is reactivated from the keep-alive cache. |

```vue:line-numbers
<template>
  <vue-stack-tabs
    iframe-path="/iframe"
    @on-active="(id) => console.log('active tab:', id)"
    @on-page-loaded="() => console.log('page ready')"
  />
</template>
```

`onPageLoaded` fires on every activation of a cached page, not only on its first mount.
