<!--
  ContextMenuItem - 右键菜单单项

  职责：展示图标和标题，支持 disabled 状态
-->
<template>
  <button type="button" role="menuitem" class="stack-tab__contextmenu-item" :disabled="disabled">
    <span class="stack-tab__contextmenu-icon" :class="icon" aria-hidden="true" />
    <span class="stack-tab__contextmenu-title" @contextmenu.prevent>{{ title }}</span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 图标 class，如 stack-tab__icon-reload svg-mask */
    icon?: string
    /** 显示文本 */
    title: string
    /** 是否禁用 */
    disabled?: boolean
  }>(),
  {
    icon: '',
    disabled: false
  }
)
</script>

<style lang="scss" scoped>
.stack-tab__contextmenu-title {
  margin-left: 8px;
}
</style>
