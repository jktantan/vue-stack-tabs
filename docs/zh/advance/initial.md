# 初始化页签

通过配置 StackTabs 组件的 `default-tabs` 属性，可以设置进入页面时默认显示的页签。
:::warning
如需一个始终存在的落地页签，请使用 `home-tab`；仅使用 `default-tabs` 时，建议至少配置一个页签并把它设为不可关闭。
:::

第一个页签的 `path` 应与应用入口路由一致。首次进入时 URL 上还没有 `__tab`：组件会把当前路由归属到栈顶 path 匹配的默认页签，并把 `__tab` 写回地址，从而让 URL 始终指向当前页签。

## 示例

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe" :default-tabs="defaultTabs" />
</template>
<script lang="ts" setup>
  import { type ITabData } from 'vue-stack-tabs'

  const defaultTabs: ITabData[] = [
    {
      id: 'dashboard',
      title: '首页',
      path: '/dashboard',
      closable: false
    }
  ]

</script>
```

## 固定首页（home-tab）

`default-tabs` 只决定启动时创建哪些页签。如果需要一个始终存在、不可关闭、不可移动的首页，请使用 `home-tab`：

```vue:line-numbers
<template>
  <vue-stack-tabs
    iframe-path="/iframe"
    :home-tab="{ id: 'home', title: '首页', path: '/' }"
    :default-tabs="defaultTabs"
  />
</template>
<script lang="ts" setup>
  import { type ITabData } from 'vue-stack-tabs'

  const defaultTabs: ITabData[] = [
    {
      id: 'settings',
      title: '设置',
      path: '/settings'
    }
  ]
</script>
```

行为：

- 首页始终创建在第一位，并强制 `closable: false`、不可拖动；其他页签不能移动到它前面。
- 未指定 `id` 时使用内部固定 id，刷新后仍能与 `__tab` / session 对齐。
- URL 没有 `__tab` 时：先按 `path` 归属到已有页签（包括 `default-tabs`）；都匹配不到才 `replace` 到首页的 `path`。
- URL 带有 `__tab`（包括无效的 `__tab`）时不会回落到首页，仍按原逻辑新建/复用页签；带有效 `__tab` 的未知页面交给应用自己的 404 路由处理。
- 不要把首页同时写进 `default-tabs`；相同 `id` 会被忽略。
- 不配置 `home-tab` 时，`default-tabs` 与现有行为完全一致。

:::warning
`home-tab.path` 必须是应用里真实存在的路由，否则重定向后的页面可能为空。
:::
