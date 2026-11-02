# Custom Slots

VueStackTabs supports these slots:

| Slot          | Slot props       | Description                                                                   |
| ------------- | ---------------- | ----------------------------------------------------------------------------- |
| leftButton    | —                | Left side of tab bar                                                          |
| rightButton   | —                | Right side of tab bar                                                         |
| iframeLoading | `{ tab }`        | Custom loading placeholder for an iframe tab                                  |
| iframeError   | `{ tab, retry }` | Custom error placeholder for an iframe tab; call `retry(tab.id)` to reload it |

**Example — tab bar buttons:**

```vue:line-numbers
<script lang="ts" setup>
  import { TabHeaderButton } from 'vue-stack-tabs'
</script>
<template>
  <vue-stack-tabs iframe-path="/iframe">
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

`TabHeaderButton` is exported from the package entry. Vue 3 projects import it as shown above; with the `vue-stack-tabs/nuxt` module it is registered globally, so the import can be omitted.

**Example — iframe placeholders:**

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe">
    <template #iframeLoading="{ tab }">
      <span>Loading {{ tab.title }}…</span>
    </template>
    <template #iframeError="{ tab, retry }">
      <span>{{ tab.title }} failed to load</span>
      <button @click="retry(tab.id)">Retry</button>
    </template>
  </vue-stack-tabs>
</template>
```
