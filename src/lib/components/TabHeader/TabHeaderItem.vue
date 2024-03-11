<template>
  <li
    ref="curtab"
    class="stack-tab__item"
    :class="{
      'is-active': item.active,
      'is-icon': item.closable
    }"
    @click="activeTab(true)"
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
      @click.stop="closeTab"
    />
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ITabItem } from '@/lib/model/TabModel'
import { MittType, useEmitter } from '../../hooks/useTabMitt'
import { useI18n } from 'vue-i18n-lite'
// 消息
const emit = defineEmits(['close', 'active'])
const emitter = useEmitter()
const { t } = useI18n()
const curtab = ref<HTMLElement>()
const props = defineProps<{
  item: ITabItem
}>()
/**
 * 如果Active为true，就看看
 */
// watch(
//   () => props.item.active,
//   (val) => {
//     if (val) {
//       activeTab()
//     }
//   }
// )
emitter.on(MittType.TAB_ACTIVE, ({ id, isRoute }: any) => {
  if (props.item.id === id) {
    activeTab(isRoute)
  }
})
const title = computed<string>(() => {
  return props.item.title || t('undefined')
})

const closeTab = () => {
  emit('close', props.item)
}
const activeTab = (isRoute: boolean = true) => {
  // if (!props.active) {
  emit('active', props.item, curtab, isRoute)
  // }
}
</script>

<style lang="scss" scoped></style>
