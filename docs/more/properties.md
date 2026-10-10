# Props

| Prop | Description | Type | Default |
|------|-------------|------|---------|
| defaultTabs | Default tabs | `ITabData[]` | `[]` |
| max | Max open tabs | `number` | `20` |
| contextmenu | Right-click context menu. `true` (default) = built-in menu; `false` = browser default; `IContextMenu[]` = append custom items | `boolean \| IContextMenu[]` | `true` |
| pageTransition | Forward page transition name | `string` | `stack-tab-swap` |
| pageTransitionBack | Backward page transition name | `string` | `stack-tab-swap-back` |
| tabTransition | Tab transition name. Accepts string or `TransitionProps` object | `string \| TransitionProps` | `stack-tab-zoom` |
| tabScrollMode | Tab bar scroll mode | `TabScrollMode.WHEEL \| BUTTON \| BOTH` | `TabScrollMode.BOTH` |
| width | Component width | `string` | `100%` |
| height | Component height | `string` | `100%` |
| i18n | Locale | `string` | `zh-CN` |
| space | Tab scroll step (px) | `number` | `300` |
| globalScroll | Use page-level scroll | `boolean` | `false` |
| iframePath | iframe route path (**required**) | `string` | — |
| iframeAllowedOrigins | Allowed origins for postMessage openTab | `string[]` | `[]` |
| iframeSandbox | iframe `sandbox` attribute | `string` | `allow-scripts allow-forms allow-popups allow-downloads allow-same-origin` |
| iframeReferrerPolicy | iframe `referrerpolicy` | `ReferrerPolicy` | `strict-origin-when-cross-origin` |
| iframeAllow | iframe `allow` attribute (Permissions Policy) | `string` | `''` |
| iframeLoadTimeout | iframe load timeout (ms); shows error UI on timeout | `number` | `15000` |
| sessionPrefix | Prefix for sessionStorage keys; useful when hosting multiple instances on the same origin | `string` | `''` |

> **注意**：`iframePath` 必传，缺失时开发环境会抛 Error，生产环境会打印 `console.error`。详见 [Nuxt 集成](../base/nuxt.md) 与 [iframe & Parent Communication](../advance/iframe-bridge.md)。

