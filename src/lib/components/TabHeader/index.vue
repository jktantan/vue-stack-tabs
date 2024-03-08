<template>
  <div class="stack-tab__header">
    <slot name="leftButton" />
    <tab-header-scroll
      ref="scroll"
      :space="space"
      :is-scroll-wheel="isScrollWheel"
      :is-scroll-button="isScrollButton"
    >
      <template #default>
        <transition-group
          key="tabItemTrans"
          tag="ul"
          class="stack-tab__nav"
          v-bind="tabTrans"
          appear
        >
          <tab-header-item
            v-for="(item, index) in tabs"
            :key="item.id"
            :contextmenu="contextmenu"
            :item="item"
            @contextmenu.prevent="
              (e: MouseEvent) => showContextMenu(e, item as ITabItem, index, tabs.length)
            "
            @click.middle.prevent="closeTab(item as ITabItem)"
            @close="closeTab"
            @active="activeTab"
          />
        </transition-group>
      </template>
    </tab-header-scroll>
    <slot name="rightButton" />
    <tab-header-button
      :icon-class="maximum ? 'stack-tab__icon-restore' : 'stack-tab__icon-fullscreen'"
      :title="t('VueStackTab.maximum')"
      @click="maximum = !maximum"
    />
    <transition name="stack-tab-zoom" appear>
      <context-menu
        v-if="contextMenuShown"
        key="tabMenuTrans"
        :left="contextMenuData.left"
        :top="contextMenuData.top"
        :tab-item="contextMenuData.item as ITabItem"
        :max="contextMenuData.max"
        :index="contextMenuData.index"
      />
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { inject, computed, ref } from 'vue'
import type { TransitionProps, Ref } from 'vue'
import { TabScrollMode } from '../../model/TabModel'
import type { ITabItem } from '../../model/TabModel'
import ContextMenu from '../ContextMenu/index.vue'
import useContextMenu from '../../hooks/useContextMenu'
import localeI18n from '../../i18n'
import useTabpanel from '../../hooks/useTabpanel'
import TabHeaderItem from './TabHeaderItem.vue'
import TabHeaderScroll from './TabHeaderScroll.vue'
import TabHeaderButton from './TabHeaderButton.vue'
// @ts-ignore
const { t } = localeI18n().getI18n()
const maximum = inject<boolean>('maximum')
const emit = defineEmits(['active'])
const scroll = ref()
const { shown: contextMenuShown, contextMenuData, showContextMenu } = useContextMenu()

const props = withDefaults(
  defineProps<{
    space: number
    // tab的滚动方式
    tabScrollMode?: TabScrollMode
    // tab动画
    tabTransition?: string | TransitionProps
    contextmenu?: boolean | object
    max?: number
  }>(),
  {
    tabTransition: () => {
      return {
        name: 'stack-tab-zoom'
      }
    },
    tabScrollMode: TabScrollMode.BOTH,
    contextmenu: true,
    max: 20
  }
)
const { removeTab, active, tabs } = useTabpanel()

// 转换tab动画
const tabTrans = computed<TransitionProps>(() => {
  if (typeof props.tabTransition === 'string') {
    return {
      name: props.tabTransition
    } as TransitionProps
  }
  return props.tabTransition as TransitionProps
})
// 判断是否有滚动按钮
const isScrollButton = computed<boolean>(() => {
  return props.tabScrollMode === TabScrollMode.BOTH || props.tabScrollMode === TabScrollMode.BUTTON
})
// 判断是否可以使用滚轮
const isScrollWheel =
  props.tabScrollMode === TabScrollMode.BOTH || props.tabScrollMode === TabScrollMode.WHEEL

// 关闭前，先判断是不最先中状态
const closeTab = (item: ITabItem) => {
  // emit('close', item)
  if (item.closable) {
    const activeId = removeTab(item.id)
    emit('active', activeId)
  }
  contextMenuShown.value = false
}

const activeTab = (item: ITabItem, curActiveTab: Ref<HTMLElement>) => {
  if (scroll.value) {
    if (!scroll.value!.isInView(curActiveTab.value)) {
      scroll.value!.scrollIntoView(curActiveTab.value)
    }

    active(item.id)
    emit('active', item.id)
  }
}
</script>

<style scoped></style>
