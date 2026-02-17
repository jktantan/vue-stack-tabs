<!--
  ContextMenu - 标签右键菜单

  职责：刷新、关闭、关闭左侧/右侧/其他/全部、新窗口打开（iframe），以及自定义菜单项
  扩展：通过 contextMenu prop 传入 IContextMenu[] 添加自定义项
-->
<template>
  <div
    ref="menuElementRef"
    class="stack-tab__contextmenu"
    :style="{
      left: `${menuPosition.left}px`,
      top: `${menuPosition.top}px`,
      'z-index': getMaxZIndex('.stack-tab,.stack-tab *')
    }"
  >
    <context-menu-item
      icon="stack-tab__icon-reload svg-mask"
      :title="t('VueStackTab.reload')"
      :disabled="!tabItem.refreshable ? 'disabled' : null"
      @click="handleMenuItemClick(() => refreshTab(tabItem.id))"
    />
    <context-menu-item
      icon="stack-tab__icon-reload-all svg-mask"
      :title="t('VueStackTab.reloadAll')"
      @click="handleMenuItemClick(refreshAllTabs)"
    />
    <context-menu-item
      icon="stack-tab__icon-close svg-mask"
      :title="t('VueStackTab.close')"
      :disabled="!tabItem.closable ? 'disabled' : null"
      @click="handleMenuItemClick(() => closeTab(tabItem.id))"
    />
    <context-menu-item
      icon="stack-tab__icon-close-lefts svg-mask"
      :title="t('VueStackTab.closeLeft')"
      :disabled="index <= 0 ? 'disabled' : null"
      @click="handleMenuItemClick(() => removeLeftTabs(tabItem.id))"
    />
    <context-menu-item
      icon="stack-tab__icon-close-rights svg-mask"
      :title="t('VueStackTab.closeRight')"
      :disabled="index >= max - 1 ? 'disabled' : null"
      @click="handleMenuItemClick(() => removeRightTabs(tabItem.id))"
    />
    <context-menu-item
      icon="stack-tab__icon-close-others svg-mask"
      :title="t('VueStackTab.closeOthers')"
      @click="handleMenuItemClick(() => removeOtherTabs(tabItem.id))"
    />
    <context-menu-item
      icon="stack-tab__icon-close-all svg-mask"
      :title="t('VueStackTab.closeAll')"
      @click="handleMenuItemClick(closeAllTabs)"
    />
    <context-menu-item
      v-if="tabItem.iframe && tabItem.url"
      icon="stack-tab__icon-open svg-mask"
      :title="t('VueStackTab.openInNewWindow')"
      @click="handleMenuItemClick(() => openInNewWindow(tabItem.id))"
    />
    <div
      v-if="contextMenu !== undefined && contextMenu.length > 0"
      class="divider div-transparent"
    ></div>
    <context-menu-item
      v-for="(item, menuIndex) in contextMenu"
      :key="menuIndex"
      :icon="item.icon"
      :title="item.title"
      :disabled="item.disabled(tabItem) ? 'disabled' : null"
      @click="handleMenuItemClick(() => !item.disabled(tabItem) && item.callback(tabItem.id))"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import type { ITabItem, IContextMenu } from '../../model/TabModel'
import { useI18n } from 'vue-i18n-lite'
import { getMaxZIndex } from '../../utils/scrollUtils'
import useTabActions from '../../hooks/useTabActions'
import useTabPanel from '../../hooks/useTabPanel'
import ContextMenuItem from './ContextMenuItem.vue'

const props = withDefaults(
  defineProps<{
    index: number
    left?: number
    top?: number
    contextMenu?: Array<IContextMenu>
    tabItem: ITabItem
    max: number
  }>(),
  {
    left: 0,
    top: 0,
    contextMenu: () => []
  }
)
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
/** 菜单根元素，用于计算宽度做右边界溢出修正 */
const menuElementRef = ref<HTMLElement>()
/** 菜单定位坐标，onMounted 时根据右边界修正 left */
const menuPosition = reactive({ left: props.left, top: props.top })
const { closeTab, closeAllTabs, refreshTab, refreshAllTabs, openInNewWindow } = useTabActions()
const { removeLeftTabs, removeRightTabs, removeOtherTabs } = useTabPanel()

/** 菜单项点击：执行回调并关闭菜单 */
const handleMenuItemClick = (fn?: () => void) => {
  fn?.()
  emit('close')
}
/** 挂载后修正菜单位置，避免超出右边界 */
onMounted(() => {
  const menuWidth = menuElementRef.value?.clientWidth ?? 0
  if (menuPosition.left + menuWidth > window.innerWidth) {
    menuPosition.left = window.innerWidth - menuWidth - 5
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
