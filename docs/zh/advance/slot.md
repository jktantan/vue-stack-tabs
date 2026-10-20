# 自定义插槽

VueStackTabs 支持通过以下插槽个性化页签组件：

| 插槽名称      | 插槽参数         | 说明                                                      |
| ------------- | ---------------- | --------------------------------------------------------- |
| leftButton    | —                | 页签栏左边按钮位                                          |
| rightButton   | —                | 页签栏右边按钮位                                          |
| iframeLoading | `{ tab }`        | 自定义 iframe 加载中占位                                  |
| iframeError   | `{ tab, retry }` | 自定义 iframe 加载失败占位，调用 `retry(tab.id)` 重新加载 |

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
