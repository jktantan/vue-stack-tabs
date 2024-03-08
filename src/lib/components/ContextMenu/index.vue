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
      @click="refreshTab(tabItem.id)"
    />
    <context-menu-item
      icon="stack-tab__icon-reload-all svg-mask"
      :title="t('VueStackTab.reloadAll')"
      @click="refreshAllTabs"
    />
    <context-menu-item
      icon="stack-tab__icon-close svg-mask"
      :title="t('VueStackTab.close')"
      :disabled="!tabItem.closable ? 'disabled' : null"
      @click="removeTab(tabItem.id)"
    />
    <context-menu-item
      icon="stack-tab__icon-close-lefts svg-mask"
      :title="t('VueStackTab.closeLefts')"
      :disabled="index <= 0 ? 'disabled' : null"
      @click="removeLeftTabs(tabItem.id)"
    />
    <context-menu-item
      icon="stack-tab__icon-close-rights svg-mask"
      :title="t('VueStackTab.closeRights')"
      :disabled="index >= max - 1 ? 'disabled' : null"
      @click="removeRightTabs(tabItem.id)"
    />
    <context-menu-item
      icon="stack-tab__icon-close-others svg-mask"
      :title="t('VueStackTab.closeOthers')"
      @click="removeOtherTabs(tabItem.id)"
    />
    <context-menu-item
      icon="stack-tab__icon-close-all svg-mask"
      :title="t('VueStackTab.closeAll')"
      @click="removeAllTabs"
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

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import type { ITabItem, IContextMenu } from '../../model/TabModel'
import localeI18n from '../../i18n'
import { getMaxZIndex } from '../../utils/TabScrollHelper'
import useTabpanel from '../../hooks/useTabpanel'
import ContextMenuItem from './ContextMenuItem.vue'
// const emit = defineEmits(['close', 'closeAll', 'closeLeft', 'closeRight', 'refresh', 'refreshAll'])
const props = withDefaults(
  defineProps<{
    index: number
    left: number
    top: number
    contextMenu?: Array<IContextMenu>
    tabItem: ITabItem
    max: number
  }>(),
  {
    left: 0,
    top: 0,
    contextMen: []
  }
)
// @ts-ignore
const { t } = localeI18n().getI18n()
const contextmenu = ref<HTMLElement>()
const modifyData = reactive({
  left: props.left,
  top: props.top
})
const {
  removeTab,
  removeAllTabs,
  removeLeftTabs,
  removeRightTabs,
  refreshTab,
  refreshAllTabs,
  removeOtherTabs
} = useTabpanel()
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
