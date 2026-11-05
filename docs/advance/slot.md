# Custom Slots

VueStackTabs supports these slots:

| Slot          | Slot props       | Description                                                                                   |
| ------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| background    | —                | Background layer for a background component; fills the container below the header and content |
| leftButton    | —                | Left side of tab bar                                                                          |
| rightButton   | —                | Right side of tab bar                                                                         |
| iframeLoading | `{ tab }`        | Custom loading placeholder for an iframe tab                                                  |
| iframeError   | `{ tab, retry }` | Custom error placeholder for an iframe tab; call `retry(tab.id)` to reload it                 |
| pageLoading   | `{ tab }`        | Loading UI for a pending tab; defaults to the built-in `PageLoading`                          |

**Example — background layer:**

Use the `background` prop or `--stack-tab-background` for plain colors, gradients and images. For component-based backgrounds (WebGL, canvas, animated ambience), use the `#background` slot (the example assumes `AppAmbientBackdrop` is imported locally or auto-imported by Nuxt):

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe">
    <template #background>
      <AppAmbientBackdrop />
    </template>
  </vue-stack-tabs>
</template>
```

The background layer absolutely fills the container. Stacking order: container CSS background (`background` prop / `--stack-tab-background`) → `#background` slot → header and content. It defaults to `pointer-events: none`, so tabs and page interactions are unaffected; a background component that needs interaction can restore `pointer-events: auto` in its own styles. The layer is `aria-hidden="true"`, so use it for decorative backgrounds only.

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

### TabHeaderButton props

| Prop      | Type                        | Default | Description                                             |
| --------- | --------------------------- | ------- | ------------------------------------------------------- |
| disabled  | `boolean`                   | `false` | Disable the button                                      |
| shadow    | `'left' \| 'right' \| null` | `null`  | Shadow direction shown when the tab bar reaches an edge |
| iconClass | `string`                    | `''`    | Icon class used when no `#icon` slot is provided        |
| title     | `string`                    | `''`    | Tooltip text, also used as the default accessible label |
| ariaLabel | `string`                    | `''`    | Accessible label; falls back to `title`                 |

Pass the button content through the default slot or the `#icon` slot. The `#icon` slot uses the library's icon container (centered, with hover / active color feedback).

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

**Example — pending tab loading UI:**

When `openTab()` or a route navigation creates a pending tab and the target page chunk is still loading, the content area renders `#pageLoading`. The slot prop is the pending tab:

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe">
    <template #pageLoading="{ tab }">
      <div class="my-loading">Opening {{ tab.title }}…</div>
    </template>
  </vue-stack-tabs>
</template>
```

Without this slot the built-in `PageLoading` is used. This is **navigation-level** loading; for async requests inside a page use [`useTabLoading`](../more/useTabLoading.md). Set the `pageLoading` prop to `false` to disable navigation loading entirely.
