# 属性

| 属性名               | 说明                                                                                                            | 类型                      | 默认值                                                                   |
| :------------------- | :-------------------------------------------------------------------------------------------------------------- | :------------------------ | :----------------------------------------------------------------------- |
| defaultTabs          | 默认页签                                                                                                        | ITabData 数组             | []                                                                       |
| max                  | 最大打开数量                                                                                                    | number                    | 20                                                                       |
| contextmenu          | 右键菜单。`true`（默认）= 内置菜单；`false` = 浏览器默认菜单；`IContextMenu[]` = 追加自定义菜单项               | boolean \| IContextMenu[] | true                                                                     |
| pageTransition       | 前进时的页面转场效果                                                                                            | string                    | stack-tab-swap                                                           |
| pageTransitionBack   | 后退时的页面转场效果                                                                                            | string                    | stack-tab-swap-back                                                      |
| tabTransition        | 标签转场效果，可传字符串或 `TransitionProps` 对象                                                               | string \| TransitionProps | stack-tab-zoom                                                           |
| tabScrollMode        | 页签滚动模式                                                                                                    | TabScrollMode             | TabScrollMode.BOTH                                                       |
| space                | 页签滚动一步的像素距离                                                                                          | number                    | 300                                                                      |
| width                | 组件宽度                                                                                                        | string                    | 100%                                                                     |
| height               | 组件高度                                                                                                        | string                    | 100%                                                                     |
| i18n                 | 当前语言，内置 `zh-CN` / `en`                                                                                   | string                    | zh-CN                                                                    |
| globalScroll         | 全局滚动                                                                                                        | boolean                   | false                                                                    |
| iframePath           | iframe 占位路由路径（**必填**）                                                                                 | string                    | —                                                                        |
| iframeAllowedOrigins | 允许 postMessage 调用 openTab 的 iframe 来源，会与当前 origin 合并                                              | string[]                  | []                                                                       |
| iframeSandbox        | iframe sandbox 策略；默认兼容优先不是强隔离，强隔离请移除 `allow-same-origin`；传空字符串关闭 sandbox（不推荐） | string                    | allow-scripts allow-forms allow-popups allow-downloads allow-same-origin |
| iframeReferrerPolicy | iframe referrerpolicy 属性                                                                                      | ReferrerPolicy            | strict-origin-when-cross-origin                                          |
| iframeAllow          | iframe allow 属性（Permissions Policy），例如 `fullscreen`                                                      | string                    | ''                                                                       |
| iframeLoadTimeout    | iframe 加载超时时间（ms），超时后展示错误 UI                                                                    | number                    | 15000                                                                    |
| sessionPrefix        | sessionStorage 键前缀；同一 origin 下托管多实例时用于隔离                                                       | string                    | ''                                                                       |

> **注意**：`iframePath` 必填，缺失时开发环境会抛 Error，生产环境会打印 `console.error`。详见 [Nuxt 集成](../base/nuxt.md) 与 [iframe 与父窗口通信](../advance/iframe-bridge.md)。

## 事件

| 事件           | 参数         | 说明                                                   |
| -------------- | ------------ | ------------------------------------------------------ |
| `onActive`     | `id: string` | 页签被激活时触发，点击页签或通过 API 激活都会触发      |
| `onPageLoaded` | —            | 页签内页面挂载完成、或从 keep-alive 缓存重新激活时触发 |

```vue:line-numbers
<template>
  <vue-stack-tabs
    iframe-path="/iframe"
    @on-active="(id) => console.log('当前页签:', id)"
    @on-page-loaded="() => console.log('页面就绪')"
  />
</template>
```

`onPageLoaded` 在缓存页每次激活时都会触发，不只是首次挂载。
