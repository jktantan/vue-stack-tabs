# Custom Slots

VueStackTabs supports these slots:

| Slot         | Description                |
| ------------ | -------------------------- |
| leftButton   | Left side of tab bar       |
| rightButton  | Right side of tab bar      |

**Example:**

```vue:line-numbers
<script lang="ts" setup>
  import { TabHeaderButton } from 'vue-stack-tabs'
</script>
<template>
  <vue-stack-tabs>
    <template #leftButton>
      <tab-header-button
        title="Toggle"
        class="hover:text-[#409eff]"
        @click="menuCollapse = !menuCollapse"
      >
        <template #icon>
          <el-icon
            :size="20"
            :class="{ '-rotate-180': menuCollapse }"
            class="transition duration-300"
          >
            <ElIconFold />
          </el-icon>
        </template>
      </tab-header-button>
    </template>
  </vue-stack-tabs>
</template>
```
