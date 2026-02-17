<!--
  ContextMenuItem - 右键菜单单项

  职责：展示图标和标题，支持 disabled 状态
-->
<template>
  <div class="stack-tab__contextmenu-item">
    <div class="stack-tab__contextmenu-icon" :class="icon"></div>
    <div style="margin-left: 8px" @contextmenu.prevent>{{ title }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** 图标 class，如 stack-tab__icon-reload svg-mask */
  icon?: string
  /** 显示文本 */
  title: string
}>()
</script>

<style lang="scss" scoped></style>
