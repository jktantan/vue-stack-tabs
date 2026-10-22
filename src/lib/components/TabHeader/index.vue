<template>
  <div ref="headerRef" class="stack-tab__header">
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
          role="tablist"
          aria-orientation="horizontal"
          v-bind="tabTransitionProps"
          appear
          @keydown="handleTabListKeydown"
          @dragover.prevent="handleTabListDragOver"
          @drop.prevent="handleTabListDrop"
        >
          <tab-header-item
            v-for="(item, index) in tabs"
            :key="item.id"
            :item="item as ITabItem"
            :drop-position="dropIndicator?.tabId === item.id ? dropIndicator.position : undefined"
            @contextmenu="
              (e: MouseEvent) =>
                handleTabContextMenu(e, item as unknown as ITabItem, index, tabs.length)
            "
            @click.middle.prevent="handleCloseTab(item as ITabItem)"
            @close="handleCloseTab"
            @active="handleActivateTab"
            @dragstart="handleTabDragStart"
            @dragover="handleTabDragOver"
            @drop="handleTabDrop"
            @dragend="handleTabDragEnd"
          />
        </transition-group>
      </template>
    </tab-header-scroll>
    <slot name="rightButton" />
    <tab-header-button
      :icon-class="
        maximum
          ? 'stack-tab__icon stack-tab__icon--restore'
          : 'stack-tab__icon stack-tab__icon--fullscreen'
      "
      :title="maximum ? t('VueStackTab.restore') : t('VueStackTab.maximum')"
      :aria-label="maximum ? t('VueStackTab.restore') : t('VueStackTab.maximum')"
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
        :context-menu="normalizedContextMenu"
        :restore-focus-element="contextMenuTriggerElement"
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
import { inject, computed, ref, nextTick, watch, onUnmounted } from 'vue'
import type { TransitionProps } from 'vue'
import { TabScrollMode } from '../../model/TabModel'
import type { IContextMenu, ITabItem } from '../../model/TabModel'
import ContextMenu from '../ContextMenu/index.vue'
import useContextMenu from '../../hooks/useContextMenu'
import useTabActions from '../../hooks/useTabActions'
import TabHeaderItem from './TabHeaderItem.vue'
import TabHeaderScroll from './TabHeaderScroll.vue'
import TabHeaderButton from './TabHeaderButton.vue'
import { useI18n } from 'vue-i18n-lite'
import { maximumKey } from '../../hooks/stackTabsContext'
import { TabEventType, useTabEmitter } from '../../hooks/useTabEventBus'
const { t } = useI18n()
/** 是否最大化，由上层 provide */
const maximum = inject(maximumKey, ref(false))
const emit = defineEmits(['active'])
/** 滚动容器 ref，用于调用 scrollIntoView / isInView */
const scrollContainerRef = ref<InstanceType<typeof TabHeaderScroll>>()
const headerRef = ref<HTMLElement>()
const { shown: contextMenuShown, contextMenuData, showContextMenu } = useContextMenu()
const contextMenuTriggerElement = ref<HTMLElement | null>(null)
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
const { closeTab, activeTab, moveTab, tabs } = useTabActions()

/** 当前激活标签 id */
const activeTabId = computed<string>(() => tabs.value.find((tab) => tab.active)?.id ?? '')

/**
 * 将指定标签滚动到可视区域；未指定 id 时使用当前激活标签。
 * 仅在标签确实不可见时才滚动，避免干扰用户的手动滚动。
 */
const ensureTabInView = (tabId?: string) => {
  const scrollContainer = scrollContainerRef.value
  if (!scrollContainer) return

  const target = headerRef.value?.querySelector<HTMLElement>(
    tabId
      ? `.stack-tab__nav [role="tab"][data-tab-id="${CSS.escape(tabId)}"]`
      : '.stack-tab__nav .stack-tab__item--active'
  )
  const tabElement = target?.closest<HTMLElement>('.stack-tab__item')
  if (tabElement && !scrollContainer.isInView(tabElement)) {
    scrollContainer.scrollIntoView(tabElement)
  }
}

/**
 * 激活标签变化后确保其位于可视区域：
 * 覆盖新开标签、通过 openTab 唤醒已有标签、关闭标签后顺延激活等场景。
 * 仅响应用户主动滚动时不会触发（滚动不改变 active），因此不会把视图强行拉回。
 */
watch(activeTabId, () => {
  nextTick(() => ensureTabInView())
})

/** 标签已是 active 但被滚开时，显式打开/激活请求仍需把标签栏滚动到它。 */
const emitter = useTabEmitter()
const handleTabScrollTo = ({ id }: { id: string }) => {
  nextTick(() => ensureTabInView(id))
}
emitter.on(TabEventType.TAB_SCROLL_TO, handleTabScrollTo)
onUnmounted(() => {
  emitter.off(TabEventType.TAB_SCROLL_TO, handleTabScrollTo)
})
const draggingTabId = ref<string | null>(null)
type DropPosition = 'before' | 'after'
const dropIndicator = ref<{ tabId: string; position: DropPosition } | null>(null)

/** 右键菜单是否启用；仅 false 明确禁用，其余旧对象值保持启用以兼容历史写法 */
const isContextMenuEnabled = computed<boolean>(() => props.contextmenu !== false)

/** 自定义菜单数组；非数组对象按历史宽类型兼容为默认菜单，不抛错 */
const normalizedContextMenu = computed<IContextMenu[]>(() => {
  return Array.isArray(props.contextmenu) ? props.contextmenu : []
})

/** 右键标签：禁用时不阻止浏览器默认菜单，启用时打开组件菜单 */
const getContextMenuFocusElement = (event: MouseEvent): HTMLElement | null => {
  const eventTarget = event.target instanceof Element ? event.target : null
  const targetTab = eventTarget?.closest<HTMLElement>('[role="tab"]')
  if (targetTab) return targetTab

  const currentTarget = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  return currentTarget?.querySelector<HTMLElement>('[role="tab"]') ?? null
}

const handleTabContextMenu = (e: MouseEvent, item: ITabItem, index: number, max: number) => {
  if (!isContextMenuEnabled.value) return

  e.preventDefault()
  contextMenuTriggerElement.value = getContextMenuFocusElement(e)
  showContextMenu(e, item, index, max)
}

/** 原生拖放只在释放鼠标时更新顺序，避免拖动经过标签时反复变更响应式列表。 */
const handleTabDragStart = (item: ITabItem) => {
  if (item.pinned) return
  draggingTabId.value = item.id
}

const handleTabDragOver = (item: ITabItem, event: DragEvent) => {
  if (!draggingTabId.value || draggingTabId.value === item.id) {
    dropIndicator.value = null
    return
  }
  const tabElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (!tabElement) return

  const { left, width } = tabElement.getBoundingClientRect()
  const position = event.clientX < left + width / 2 ? 'before' : 'after'
  dropIndicator.value = {
    tabId: item.id,
    // pinned 标签固定在左侧，拖到它前半区时改为插到它后面。
    position: item.pinned && position === 'before' ? 'after' : position
  }
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

const handleTabDrop = (target: ITabItem) => {
  const sourceId = draggingTabId.value
  const indicator = dropIndicator.value
  draggingTabId.value = null
  dropIndicator.value = null
  if (!sourceId || sourceId === target.id || indicator?.tabId !== target.id) return
  const sourceIndex = tabs.value.findIndex((tab) => tab.id === sourceId)
  const targetIndex = tabs.value.findIndex((tab) => tab.id === target.id)
  if (sourceIndex < 0 || targetIndex < 0) return

  let destinationIndex = targetIndex
  if (indicator.position === 'before' && sourceIndex < targetIndex) destinationIndex--
  if (indicator.position === 'after' && sourceIndex > targetIndex) destinationIndex++

  // home 等 pinned 标签固定在左侧，任何标签都不能插到它前面（store 层还会再兜底）。
  let firstUnpinnedIndex = 0
  tabs.value.forEach((tab, index) => {
    if (tab.pinned) firstUnpinnedIndex = index + 1
  })
  destinationIndex = Math.max(destinationIndex, firstUnpinnedIndex)
  moveTab(sourceId, destinationIndex)
}

const handleTabDragEnd = () => {
  draggingTabId.value = null
  dropIndicator.value = null
}

/** 标签列表末端的留白也是投放区，便于明确地将标签移动到最后。 */
const isTabItemDragEvent = (event: DragEvent) =>
  event.target instanceof Element && Boolean(event.target.closest('.stack-tab__item'))

const handleTabListDragOver = (event: DragEvent) => {
  if (!draggingTabId.value || isTabItemDragEvent(event)) return
  const lastTab = tabs.value[tabs.value.length - 1]
  if (!lastTab || lastTab.id === draggingTabId.value) return

  dropIndicator.value = { tabId: lastTab.id, position: 'after' }
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

const handleTabListDrop = (event: DragEvent) => {
  if (isTabItemDragEvent(event)) return
  const lastTab = tabs.value[tabs.value.length - 1]
  if (lastTab) handleTabDrop(lastTab as ITabItem)
}

/** 标签列表 transition 的 props，支持 string 或对象 */
const tabTransitionProps = computed<TransitionProps>(() =>
  typeof props.tabTransition === 'string'
    ? ({ name: props.tabTransition } as TransitionProps)
    : (props.tabTransition as TransitionProps)
)

const getActiveTabIndex = (): number => tabs.value.findIndex((tab) => tab.active)

const focusTabById = (tabId: string) => {
  nextTick(() => {
    const activeTabElement = headerRef.value?.querySelector<HTMLElement>(
      `.stack-tab__nav [role="tab"][data-tab-id="${CSS.escape(tabId)}"]`
    )
    if (!activeTabElement) return

    activeTabElement.focus()
    if (scrollContainerRef.value && !scrollContainerRef.value.isInView(activeTabElement)) {
      scrollContainerRef.value.scrollIntoView(activeTabElement)
    }
  })
}

const activateTabByIndex = (index: number) => {
  const item = tabs.value[index]
  if (!item) return
  handleActivateTab(item as ITabItem, undefined, true)
  focusTabById(String(item.id))
}

const handleTabListKeydown = (event: KeyboardEvent) => {
  const count = tabs.value.length
  if (count <= 0) return

  const currentIndex = getActiveTabIndex()

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    // 无 active 标签时从 -1 起步，按右方向键跳到第 0 个；正常情况环绕到下一个。
    activateTabByIndex(currentIndex === -1 ? 0 : (currentIndex + 1) % count)
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    // 无 active 标签时按左方向键跳到最后一个；正常情况环绕到上一个。
    activateTabByIndex(currentIndex === -1 ? count - 1 : (currentIndex - 1 + count) % count)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    activateTabByIndex(0)
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    activateTabByIndex(count - 1)
  }
}

/** 是否显示左右滚动按钮 */
const isScrollButton = computed<boolean>(() => {
  return props.tabScrollMode === TabScrollMode.BOTH || props.tabScrollMode === TabScrollMode.BUTTON
})
/** 是否支持滚轮滚动 */
const isScrollWheel = computed<boolean>(() => {
  return props.tabScrollMode === TabScrollMode.BOTH || props.tabScrollMode === TabScrollMode.WHEEL
})

/** 关闭指定标签，并关闭右键菜单 */
const handleCloseTab = (item: ITabItem) => {
  if (item.closable) {
    closeTab(item.id)
  }
  contextMenuShown.value = false
}

/** 激活指定标签，滚动到可视区域，并触发路由跳转 */
const handleActivateTab = (
  item: ITabItem,
  clickedTabElement: HTMLElement | undefined,
  isRoute: boolean
) => {
  if (scrollContainerRef.value && clickedTabElement) {
    nextTick(() => {
      if (!scrollContainerRef.value!.isInView(clickedTabElement)) {
        scrollContainerRef.value!.scrollIntoView(clickedTabElement)
      }
    })
  }
  Promise.resolve(activeTab(item.id, isRoute))
    .then(() => emit('active', item.id))
    .catch((error: unknown) => {
      if (!import.meta.env.PROD) {
        console.warn('[vue-stack-tabs] Failed to activate tab:', error)
      }
    })
}
</script>

<style scoped></style>
