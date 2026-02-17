# 自定义插槽

VueStackTabs 支持通过以下插槽个性化页签组件：

| 插槽名称    | 说明             |
| ----------- | ---------------- |
| leftButton  | 页签栏左边按钮位 |
| rightButton | 页签栏右边按钮位 |

## 示例

```vue:line-numbers
<script lang="ts" setup>
  import { TabHeaderButton } from 'vue-stack-tabs'
</script>
<template>
  <vue-stack-tabs>
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
