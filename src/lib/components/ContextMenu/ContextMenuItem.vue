<template>
  <div class="stack-tab__contextmenu-item">
    <div class="stack-tab__contextmenu-icon" :class="icon"></div>
    <div style="margin-left: 8px" @contextmenu.prevent>{{ title }}</div>
  </div>
</template>

<script setup lang="ts" name="StackTabContextMenuItem">
defineProps<{
  icon?: string
  title: string
}>()
</script>

<style lang="scss" scoped></style>
