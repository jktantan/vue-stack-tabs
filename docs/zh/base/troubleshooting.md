# 常见问题

## `node16` / `nodenext` 下报 `TS2834` 或 `TS2614`

当 `tsconfig.json` 使用 `"moduleResolution": "node16"` 或 `"nodenext"` 时，构建可能报：

> Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.

或者更让人困惑的：

> Module '"vue-stack-tabs"' has no exported member 'TabScrollMode'.

**3.3.2 及更早版本**的声明文件里，相对导入没有文件扩展名。Bundler 式解析可以接受，Node 式解析不行。**升级到 3.3.3 或更高版本**：

```bash
pnpm add vue-stack-tabs@^3.3.3
```

如果开了 `"skipLibCheck": true`，包内的 `TS2834` 会被隐藏，只剩下游的 `TS2614` 或静默变成 `any` 的症状。临时把 `"skipLibCheck"` 设为 `false` 跑一次 `tsc --noEmit`，就能看到具体是哪个声明文件出错。

## 样式没有生效

样式文件不会被自动注入，请在入口引入一次：

```ts
import 'vue-stack-tabs/dist/style.css'
```

## `require()` 抛出 `ERR_PACKAGE_PATH_NOT_EXPORTED`

本库仅发布 ESM，没有 CommonJS 入口。ESM 代码用 `import`；CommonJS 里请动态引入：

```js
const { default: VueStackTabs } = await import('vue-stack-tabs')
```

## 刷新后只恢复了一个页签

这是刻意的设计：只持久化**上次激活的页签及其页面栈**（存于 `sessionStorage`），从未激活过或被关闭的页签不会恢复。多个应用共用同一 origin 时，请用 `sessionPrefix` 区分。

## iframe 页签空白，或通信消息被丢弃

- `iframePath` 为必填，且必须指向渲染 `IFrame` 组件的路由。
- 内嵌页面需与主应用同源，或登记在 `iframeAllowedOrigins` 中，否则通信消息会被拒绝。
- `iframeSandbox` 限制过严会阻止脚本执行，建议先用默认值。

消息格式与用法见 [iframe 通信](../advance/iframe-bridge.md)。

## Nuxt 下组件或组合式函数不可用

注册模块：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-stack-tabs/nuxt'],
  vueStackTabs: { locale: 'zh-CN' }
})
```

它会全局注册 `<VueStackTabs>`，并自动导入 `useTabActions`、`useTabRouter`、`useTabLoading`。

## Vue Router 版本不匹配

本库要求 `vue-router@^5.4.0` 与 `vue@^3.5.43`，更低版本不受支持。

---

仍未解决？查看 [CHANGELOG](https://github.com/jktantan/vue-stack-tabs/blob/main/CHANGELOG.md)，或在 [GitHub](https://github.com/jktantan/vue-stack-tabs/issues) 上提 issue。
