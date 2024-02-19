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
    <div v-if="item.closable" class="stack-tab__icon-close-fill stack-tab__item-button" :title="t('VueStackTab.close')" @click.stop="closeTab" />
  </li>
</template>

<script setup lang="ts" name="TabHeaderItem">
import { computed, ref } from 'vue'
import { TabItemData } from '../../model/TabHeaderModel'
import localeI18n from '../../i18n'
// 消息
const emit = defineEmits(['close', 'active'])

const { t } = localeI18n().getI18n()
const curtab = ref<HTMLElement>()
const props = defineProps<{
  item: TabItemData
}>()
/**
 * 如果Active为true，就看看
 */
watch(
  () => props.item.active,
  val => {
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
