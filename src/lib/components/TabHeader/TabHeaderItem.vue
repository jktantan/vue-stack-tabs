<template>
  <li
    ref="tabElementRef"
    class="stack-tab__item"
    :class="{
      'is-active': item.active,
      'is-icon': item.closable
    }"
    @click="handleActivate(true)"
  >
    <!--    <div v-if="!!icon" class="stack-tab__item-icon" :class="icon"></div>-->
    <div class="stack-tab__item-title">
      <div class="stack-tab__item-title-content" :title="title">
        {{ title }}
      </div>
    </div>
    <div
      v-if="item.closable"
      class="stack-tab__icon-close-fill stack-tab__item-button"
      :title="t('VueStackTab.close')"
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
import type { ITabItem } from '@/lib/model/TabModel'
import { TabEventType, useTabEmitter } from '../../hooks/useTabEventBus'
import { useI18n } from 'vue-i18n-lite'
const emit = defineEmits(['close', 'active'])
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
const eventType = TabEventType.TAB_ACTIVE as unknown as Parameters<typeof emitter.on>[0]
emitter.on(eventType, handleTabActiveEvent as (e: unknown) => void)
onUnmounted(() => {
  emitter.off(eventType, handleTabActiveEvent as (e: unknown) => void)
})
/** 显示标题，空时用 i18n 占位 */
const title = computed<string>(() => {
  return props.item.title || t('undefined')
})

/** 关闭按钮点击，向父级 emit close */
const handleClose = () => {
  emit('close', props.item)
}
/** 激活当前标签，向父级 emit active 并传递 DOM 引用 */
const handleActivate = (isRoute = true) => {
  emit('active', props.item, tabElementRef.value, isRoute)
}
</script>

<style lang="scss" scoped></style>
