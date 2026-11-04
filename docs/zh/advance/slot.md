# 自定义插槽

VueStackTabs 支持通过以下插槽个性化页签组件：

| 插槽名称      | 插槽参数         | 说明                                                      |
| ------------- | ---------------- | --------------------------------------------------------- |
| leftButton    | —                | 页签栏左边按钮位                                          |
| rightButton   | —                | 页签栏右边按钮位                                          |
| iframeLoading | `{ tab }`        | 自定义 iframe 加载中占位                                  |
| iframeError   | `{ tab, retry }` | 自定义 iframe 加载失败占位，调用 `retry(tab.id)` 重新加载 |
| pageLoading   | `{ tab }`        | 占位页签的加载中 UI，默认使用库内置 `PageLoading`         |

## 示例：页签栏按钮

```vue:line-numbers
<script lang="ts" setup>
  import { TabHeaderButton } from 'vue-stack-tabs'
</script>
<template>
  <vue-stack-tabs iframe-path="/iframe">
    <template #leftButton>
      <tab-header-button
        title="展开"
        class="hover:text-[#409eff]"
        @click="menuCollapse = !menuCollapse"
      >
        <template #icon>
          <el-icon
            :size="20"
            :class="{ '-rotate-180': menuCollapse }"
            class="transition duration-300"
            ><ElIconFold
          /></el-icon>
        </template>
      </tab-header-button>
    </template>
  </vue-stack-tabs>
</template>
```

`TabHeaderButton` 已从包入口导出。Vue 3 项目按上面的方式显式导入；使用 `vue-stack-tabs/nuxt` 模块时它会被自动注册为全局组件，可以省略 import。

### TabHeaderButton 属性

| 属性      | 类型                        | 默认值 | 说明                               |
| --------- | --------------------------- | ------ | ---------------------------------- |
| disabled  | boolean                     | false  | 禁用按钮                           |
| shadow    | `'left' \| 'right' \| null` | null   | 滚动到边界时显示的阴影方向         |
| iconClass | string                      | ''     | 无 `#icon` 插槽时使用的图标 class  |
| title     | string                      | ''     | 悬停提示，同时作为默认的无障碍标签 |
| ariaLabel | string                      | ''     | 辅助技术标签；未传时回退到 `title` |

按钮内容可以通过默认插槽或 `#icon` 插槽传入。`#icon` 插槽会使用库内置的图标容器（居中对齐、hover / active 颜色反馈）。

## 示例：iframe 占位

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe">
    <template #iframeLoading="{ tab }">
      <span>{{ tab.title }} 加载中…</span>
    </template>
    <template #iframeError="{ tab, retry }">
      <span>{{ tab.title }} 加载失败</span>
      <button @click="retry(tab.id)">重试</button>
    </template>
  </vue-stack-tabs>
</template>
```

## 示例：占位页签加载 UI

当 `openTab()` 或路由导航创建了占位页签、目标页面 chunk 还没加载完时，内容区会显示 `#pageLoading`。插槽作用域参数是当前占位页签：

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe">
    <template #pageLoading="{ tab }">
      <div class="my-loading">正在打开「{{ tab.title }}」…</div>
    </template>
  </vue-stack-tabs>
</template>
```

不传该插槽时使用库内置的 `PageLoading`。这是**导航级**占位：页面内异步请求的加载遮罩请使用 [`useTabLoading`](../more/useTabLoading.md)。可以通过 `pageLoading` 属性整体关闭导航加载态。
