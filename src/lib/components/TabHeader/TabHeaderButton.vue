<!--
  TabHeaderButton - 通用图标按钮

  职责：左右滚动箭头、全屏/还原按钮，支持禁用与阴影样式
-->
<template>
  <button
    type="button"
    class="stack-tab__header-button"
    :class="{
      'stack-tab__shadow-right': shadow === 'right',
      'stack-tab__shadow-left': shadow === 'left'
    }"
    :disabled="disabled"
    :title="title"
    :aria-label="resolvedAriaLabel"
  >
    <span v-if="!('icon' in $slots)" class="stack-tab__mask-button" :class="iconClass" />
    <span v-if="'icon' in $slots" class="stack-tab__button">
      <slot name="icon" />
    </span>
  </button>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 是否禁用 */
    disabled?: boolean
    /** 阴影方向，用于滚动到边界时的视觉提示 */
    shadow?: 'left' | 'right' | null
    /** 图标 class（无 slot 时使用） */
    iconClass?: string
    /** 悬停提示 */
    title?: string
    /** 辅助技术标签，未传时使用 title */
    ariaLabel?: string
  }>(),
  {
    disabled: false,
    shadow: null,
    iconClass: '',
    title: '',
    ariaLabel: ''
  }
)

const DEFAULT_ICON_LABELS: Record<string, string> = {
  'stack-tab__icon-left-arrow': 'Scroll tabs left',
  'stack-tab__icon-right-arrow': 'Scroll tabs right'
}

const resolvedAriaLabel = computed<string>(() => {
  return props.ariaLabel || props.title || DEFAULT_ICON_LABELS[props.iconClass] || ''
})
</script>

<style scoped></style>
