<template>
  <div
    ref="contextmenu"
    class="stack-tab__contextmenu"
    :style="{
      left: `${modifyData.left}px`,
      top: `${modifyData.top}px`,
      'z-index': getMaxZIndex('.stack-tab,.stack-tab *')
    }"
  >
    <context-menu-item
      icon="stack-tab__icon-reload svg-mask"
      :title="t('VueStackTab.reload')"
      @click="refresh(tabItem)"
    />
    <context-menu-item
      icon="stack-tab__icon-reload-all svg-mask"
      :title="t('VueStackTab.reloadAll')"
      @click="refreshAll"
    />
    <context-menu-item
      icon="stack-tab__icon-close svg-mask"
      :title="t('VueStackTab.close')"
      :disabled="!tabItem.closable ? 'disabled' : null"
      @click="close(tabItem)"
    />
    <context-menu-item
      icon="stack-tab__icon-close-lefts svg-mask"
      :title="t('VueStackTab.closeLefts')"
      :disabled="index <= 0 ? 'disabled' : null"
      @click="closeLeft(tabItem)"
    />
    <context-menu-item
      icon="stack-tab__icon-close-rights svg-mask"
      :title="t('VueStackTab.closeRights')"
      :disabled="index >= max - 1 ? 'disabled' : null"
      @click="closeRight(tabItem)"
    />
    <context-menu-item
      icon="stack-tab__icon-close-others svg-mask"
      :title="t('VueStackTab.closeOthers')"
      @click="closeOthers(tabItem)"
    />
    <context-menu-item
      icon="stack-tab__icon-close-all svg-mask"
      :title="t('VueStackTab.closeAll')"
      @click="closeAll"
    />
    <div
      v-if="contextMenu !== undefined && contextMenu.length > 0"
      class="divider div-transparent"
    ></div>
    <context-menu-item
      v-for="(item, index) in contextMenu"
      :key="index"
      :icon="item.icon"
      :title="item.title"
      :disabled="item.disabled(tabItem) ? 'disabled' : null"
      @click="!item.disabled && item.callback(tabItem.id)"
    />
  </div>
</template>

<script setup lang="ts" name="StackTabContextMenu">
import { ref, onMounted, reactive } from 'vue'
import { TabItemData } from '@/lib/model/TabHeaderModel'
import type { ContextMenu } from '@/lib/model/ContextMenuModel'
import localeI18n from '@/lib/i18n'
import { getMaxZIndex } from '@/lib/utils/TabScrollHelper'
import useTabEvent from '@/lib/hooks/useTabEvent'
import ContextMenuItem from './ContextMenuItem.vue'
// const emit = defineEmits(['close', 'closeAll', 'closeLeft', 'closeRight', 'refresh', 'refreshAll'])
const props = withDefaults(
  defineProps<{
    index: number
    left: number
    top: number
    contextMenu?: Array<ContextMenu>
    tabItem: TabItemData
    max: number
  }>(),
  {
    left: 0,
    top: 0,
    contextMen: []
  }
)
const { t } = localeI18n().getI18n()
const contextmenu = ref<HTMLElement>()
const modifyData = reactive({
  left: props.left,
  top: props.top
})
const { close, closeAll, closeLeft, closeRight, refresh, refreshAll, closeOthers } = useTabEvent()
onMounted(() => {
  const clientWidth = contextmenu.value ? contextmenu.value.clientWidth : 0
  const winWidth = window.innerWidth
  if (modifyData.left + clientWidth > winWidth) {
    modifyData.left = winWidth - clientWidth - 5
  }
})
</script>

<style lang="scss" scoped>
.divider {
  position: relative;
  height: 1px;
  margin: 5px 0;
}

.div-transparent::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-image: linear-gradient(to right, transparent, darkgrey, transparent);
  content: '';
}
</style>
