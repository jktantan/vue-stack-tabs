<template>
  <li
    ref="tabElementRef"
    role="presentation"
    class="stack-tab__item"
    :class="{
      'is-active': item.active,
      'is-icon': item.closable
    }"
    @click.self="handleActivate(true)"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <button
      type="button"
      role="tab"
      class="stack-tab__item-tab"
      :aria-selected="item.active ? 'true' : 'false'"
      :tabindex="item.active ? 0 : -1"
      :title="title"
      @click="handleActivate(true)"
      @keydown="handleTabKeydown"
    >
      <span class="stack-tab__item-title">
        <span class="stack-tab__item-title-content">
          {{ title }}
        </span>
      </span>
    </button>
    <button
      v-if="item.closable"
      type="button"
      class="stack-tab__icon-close-fill stack-tab__item-button"
      :title="t('VueStackTab.close')"
      :aria-label="`${t('VueStackTab.close')} ${title}`"
      @click.stop="handleClose"
    />
  </li>
</template>

<!--
  TabHeaderItem - 单个标签项

  职责：展示标签标题、激活/关闭，监听 TAB_ACTIVE 事件
-->
<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import type { ITabItem } from '../../model/TabModel'
import { TabEventType, useTabEmitter } from '../../hooks/useTabEventBus'
import { useI18n } from 'vue-i18n-lite'
const emit = defineEmits(['close', 'active', 'contextmenu'])
const emitter = useTabEmitter()
const { t } = useI18n()
/** 当前标签 DOM 元素，用于滚动到可视区域 */
const tabElementRef = ref<HTMLElement>()
const props = defineProps<{
  item: ITabItem
}>()

/** TAB_ACTIVE 事件 payload */
type TabActivePayload = { id: string; isRoute?: boolean }
/** 收到 TAB_ACTIVE 且 id 匹配时，触发激活 */
const handleTabActiveEvent = (payload: TabActivePayload) => {
  if (props.item.id === payload.id) {
    handleActivate(payload.isRoute ?? true)
  }
}
emitter.on(TabEventType.TAB_ACTIVE, handleTabActiveEvent)
onUnmounted(() => {
  emitter.off(TabEventType.TAB_ACTIVE, handleTabActiveEvent)
})
/** 显示标题，空时用 i18n 占位 */
const title = computed<string>(() => props.item.title || t('VueStackTab.undefined'))

/** 关闭按钮点击，向父级 emit close */
const handleClose = () => {
  emit('close', props.item)
}
/** 激活当前标签，向父级 emit active 并传递 DOM 引用 */
const handleActivate = (isRoute = true) => {
  emit('active', props.item, tabElementRef.value, isRoute)
}

const handleTabKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleActivate(true)
    return
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && props.item.closable) {
    event.preventDefault()
    handleClose()
  }
}
</script>

<style lang="scss" scoped></style>
