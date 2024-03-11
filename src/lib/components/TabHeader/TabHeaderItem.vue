<template>
  <li
    ref="curtab"
    class="stack-tab__item"
    :class="{
      'is-active': item.active,
      'is-icon': item.closable
    }"
    @click="activeTab"
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

<script setup lang="ts" name="TabHeaderItem">
import { computed, ref, watch } from 'vue'
import type { ITabItem } from '@/lib/model/TabModel'
import { useI18n } from 'vue-i18n-lite'
// 消息
const emit = defineEmits(['close', 'active'])

const { t } = useI18n()
const curtab = ref<HTMLElement>()
const props = defineProps<{
  item: ITabItem
}>()
/**
 * 如果Active为true，就看看
 */
watch(
  () => props.item.active,
  (val) => {
    if (val) {
      activeTab()
    }
  }
)
const title = computed<string>(() => {
  return props.item.title || t('undefined')
})

const closeTab = () => {
  emit('close', props.item)
}
const activeTab = () => {
  // if (!props.active) {
  emit('active', props.item, curtab)
  // }
}
</script>

<style lang="scss" scoped></style>
