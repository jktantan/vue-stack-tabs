<template>
  <div class="stack-tab__header">
    <slot name="leftButton" />
    <tab-header-scroll
      ref="scrollContainerRef"
      :space="space"
      :is-scroll-wheel="isScrollWheel"
      :is-scroll-button="isScrollButton"
    >
      <template #default>
        <transition-group
          key="tab-list-transition"
          tag="ul"
          class="stack-tab__nav"
          v-bind="tabTransitionProps"
          appear
        >
          <tab-header-item
            v-for="(item, index) in tabs"
            :key="item.id"
            :contextmenu="contextmenu"
            :item="item as ITabItem"
            @contextmenu.prevent="
              (e: MouseEvent) => showContextMenu(e, item as unknown as ITabItem, index, tabs.length)
            "
            @click.middle.prevent="handleCloseTab(item as ITabItem)"
            @close="handleCloseTab"
            @active="handleActivateTab"
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
        key="context-menu-transition"
        :left="contextMenuData.left"
        :top="contextMenuData.top"
        :tab-item="contextMenuData.item as ITabItem"
        :max="contextMenuData.max"
        :index="contextMenuData.index"
        @close="handleCloseContextMenu"
      />
    </transition>
  </div>
</template>

<!--
  TabHeader - 标签栏头部组件

  职责：展示标签列表、左右滚动、最大化按钮、右键菜单
  依赖：useTabActions(tabs/closeTab/activeTab)、useContextMenu
-->
<script lang="ts" setup>
import { inject, computed, ref, nextTick } from 'vue'
import type { TransitionProps } from 'vue'
import { TabScrollMode } from '../../model/TabModel'
import type { ITabItem } from '../../model/TabModel'
import ContextMenu from '../ContextMenu/index.vue'
import useContextMenu from '../../hooks/useContextMenu'
import useTabActions from '../../hooks/useTabActions'
import TabHeaderItem from './TabHeaderItem.vue'
import TabHeaderScroll from './TabHeaderScroll.vue'
import TabHeaderButton from './TabHeaderButton.vue'
import { useI18n } from 'vue-i18n-lite'
const { t } = useI18n()
/** 是否最大化，由上层 provide */
const maximum = inject<boolean>('maximum')
const emit = defineEmits(['active'])
/** 滚动容器 ref，用于调用 scrollIntoView / isInView */
const scrollContainerRef = ref<InstanceType<typeof TabHeaderScroll>>()
const { shown: contextMenuShown, contextMenuData, showContextMenu } = useContextMenu()
/** 关闭右键菜单 */
const handleCloseContextMenu = () => {
  contextMenuShown.value = false
}

const props = withDefaults(
  defineProps<{
    space: number
    tabScrollMode?: TabScrollMode
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
const { closeTab, activeTab, tabs } = useTabActions()

/** 标签列表 transition 的 props，支持 string 或对象 */
const tabTransitionProps = computed<TransitionProps>(() =>
  typeof props.tabTransition === 'string'
    ? ({ name: props.tabTransition } as TransitionProps)
    : (props.tabTransition as TransitionProps)
)

/** 是否显示左右滚动按钮 */
const isScrollButton = computed<boolean>(() => {
  return props.tabScrollMode === TabScrollMode.BOTH || props.tabScrollMode === TabScrollMode.BUTTON
})
/** 是否支持滚轮滚动 */
const isScrollWheel =
  props.tabScrollMode === TabScrollMode.BOTH || props.tabScrollMode === TabScrollMode.WHEEL

/** 关闭指定标签，并关闭右键菜单 */
const handleCloseTab = (item: ITabItem) => {
  if (item.closable) {
    closeTab(item.id)
  }
  contextMenuShown.value = false
}

/** 激活指定标签，滚动到可视区域，并触发路由跳转 */
const handleActivateTab = (item: ITabItem, clickedTabElement: HTMLElement | undefined, isRoute: boolean) => {
  if (scrollContainerRef.value && clickedTabElement) {
    nextTick(() => {
      if (!scrollContainerRef.value!.isInView(clickedTabElement)) {
        scrollContainerRef.value!.scrollIntoView(clickedTabElement)
      }
    })
  }
  activeTab(item.id, isRoute)
  emit('active', item.id)
}
</script>

<style scoped></style>
