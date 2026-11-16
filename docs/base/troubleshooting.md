# Troubleshooting

## `TS2834` / `TS2614` under `node16` or `nodenext`

After switching `tsconfig.json` to `"moduleResolution": "node16"` or `"nodenext"`, the build may report:

> Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.

or the more confusing:

> Module '"vue-stack-tabs"' has no exported member 'TabScrollMode'.

Versions **up to 3.3.2** shipped declaration files whose relative imports had no file extensions. Bundler-style resolution accepts that, Node-style resolution does not. **Install 3.3.3 or newer**:

```bash
pnpm add vue-stack-tabs@^3.3.3
```

With `"skipLibCheck": true`, the `TS2834` errors inside the package are hidden and only the downstream `TS2614` / silently-`any` symptoms remain. Run `tsc --noEmit` once with `"skipLibCheck": false` to see which declaration file is at fault.

## Styles are missing

The stylesheet is not injected automatically — import it once:

```ts
import 'vue-stack-tabs/dist/style.css'
```

## `require()` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`

The package is ESM-only and has no CommonJS entry. Use `import` from ESM code, or from CommonJS load it dynamically:

```js
const { default: VueStackTabs } = await import('vue-stack-tabs')
```

## Session restore brings back only one tab

By design only the **last active tab and its page stack** are persisted (to `sessionStorage`). Tabs that were never activated, or that were closed, are not restored. Use a distinct `sessionPrefix` when several apps share the same origin.

## An iframe tab is blank, or bridge messages are dropped

- `iframePath` is required and must point to a route that renders the `IFrame` component.
- The embedded page must be same-origin, or listed in `iframeAllowedOrigins`; otherwise bridge messages are rejected.
- An over-restrictive `iframeSandbox` value can stop scripts — start from the default.

See [iframe Bridge](../advance/iframe-bridge.md) for the message contract.

## Nuxt: the component or composables are not registered

Register the module:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: { locale: 'zh-CN' }
})
```

This registers `<VueStackTabs>` globally and auto-imports `useTabActions`, `useTabRouter` and `useTabLoading`.

## Version mismatch with Vue Router

`vue-router@^5.4.0` and `vue@^3.5.43` are required peers; older versions are not supported.

---

Still stuck? Check the [CHANGELOG](https://github.com/jktantan/vue-stack-tabs/blob/main/CHANGELOG.md) or open an issue on [GitHub](https://github.com/jktantan/vue-stack-tabs/issues).
