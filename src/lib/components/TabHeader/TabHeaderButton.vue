<!--
  TabHeaderButton - 通用图标按钮

  职责：左右滚动箭头、全屏/还原按钮，支持禁用与阴影样式
-->
<template>
  <div
    class="stack-tab__header-button"
    :class="{
      'stack-tab__shadow-right': shadow === 'right',
      'stack-tab__shadow-left': shadow === 'left'
    }"
    :disabled="disabled ? 'disabled' : null"
    :title="title"
  >
    <div v-if="!('icon' in $slots)" class="stack-tab__mask-button" :class="iconClass" />
    <div v-if="'icon' in $slots" class="stack-tab__button">
      <slot name="icon" />
    </div>
  </div>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    /** 是否禁用 */
    disabled?: boolean
    /** 阴影方向，用于滚动到边界时的视觉提示 */
    shadow?: 'left' | 'right' | null
    /** 图标 class（无 slot 时使用） */
    iconClass?: string
    /** 悬停提示 */
    title?: string
  }>(),
  {
    disabled: false,
    shadow: null,
    iconClass: '',
    title: ''
  }
)
</script>

<style scoped></style>
