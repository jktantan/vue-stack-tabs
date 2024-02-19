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

<script lang="ts" setup name="TabHeaderButton">
withDefaults(
  defineProps<{
    // 是否禁用
    disabled?: boolean
    // 是否可显示
    visible?: boolean
    shadow?: string | null
    iconClass?: string
    title?: string | null | undefined
  }>(),
  {
    disabled: false,
    visible: true,
    shadow: null,
    iconClass: ''
  }
)
</script>

<style scoped></style>
