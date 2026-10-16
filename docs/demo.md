# Live Demo

<DemoPreview height="660px" title="vue-stack-tabs · live demo" />

The demo above is a **real Vue 3 application** — its own Vue Router, its own tabs, its own page stack — running in an isolated iframe. Use the title bar to open it in a new window.

## Why an iframe?

`vue-stack-tabs` binds every tab stack to the browser URL, so running it inside the documentation would fight VitePress for the same router. The demo therefore lives in its own app (`docs/.vitepress/demo-app`) and is embedded here; open it standalone to watch the URL, the `__tab` query and the history change as you switch tabs.

## What to try

1. **Open a tab** — click _报表列表 / Reports_, then _查看详情 / View detail_ on a row: you move **forward inside the same tab**, the tab bar does not grow.
2. **Go back with a result** — on the detail page press _后退并回传_: the list receives the value through `props._back`.
3. **Cache isolation** — click _打开 3 个报表标签_: three tabs point at the same route with different params, each with its own cache.
4. **Form state** — open _表单 / Form_, type something, switch tabs and come back: your input is still there.
5. **Scroll memory** — open _长列表 / Long list_, scroll to the middle, switch away and back: the position is restored.
6. **iframe tab** — click _打开 iframe 标签_: the page inside the iframe can ask the parent to open a new tab via `postMessage`.

## What each control covers

| Capability                       | How to see it                                         | API                             |
| -------------------------------- | ----------------------------------------------------- | ------------------------------- |
| Open / switch / close tabs       | Console buttons and right-click menu on the tab bar   | `useTabActions`                 |
| Tab bar drag & drop reordering   | Drag one tab over another                             | `moveTab`                       |
| Forward / backward inside a tab  | Reports → detail → back (with `_back` params)         | `useTabRouter`                  |
| Independent cache per tab        | Three report tabs on the same route                   | `createPageId`, keep-alive      |
| Form state preserved             | Form tab, switch away and back                        | keep-alive caching              |
| Scroll position memory           | Long list, switch away and back                       | `addScrollTarget`               |
| iframe tabs + postMessage bridge | iframe tab, then its in-page button                   | `IFrame`, `postOpenTab`         |
| Refresh single / all tabs        | Console: _刷新当前 / 刷新全部_                        | `refreshTab`, `refreshAllTabs`  |
| Session restore                  | Reload the demo page — previously open tabs come back | `sessionPrefix`, sessionStorage |
