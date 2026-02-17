<!--
  TabHeaderScroll - 可横向滚动的标签栏容器

  职责：左右箭头滚动、滚轮滚动、自定义滚动条拖拽、确保激活标签在可视区域内
-->
<template>
  <tab-header-button
    v-if="isScrollButtonVisible"
    icon-class="stack-tab__icon-left-arrow"
    :disabled="isDisabledLeftButton"
    @click="!isDisabledLeftButton && handleScrollButtonClick(-1 * space)"
  />
  <div ref="headerScroll" class="stack-tab__scroll" @wheel.passive="handleWheelScroll">
    <div
      ref="container"
      class="stack-tab__scroll-container"
      :class="{
        'stack-tab__shadow-inset-left': !isDisabledLeftButton && isDisabledRightButton,
        'stack-tab__shadow-inset-right': !isDisabledRightButton && isDisabledLeftButton,
        'stack-tab__shadow-inset-all': !isDisabledLeftButton && !isDisabledRightButton
      }"
      @scroll.passive="updateScrollState"
    >
      <slot />
    </div>
    <div
      v-show="hasScroller"
      ref="bar"
      class="stack-tab__scrollbar"
      :class="{ 'is-dragging': scrollDragging }"
    >
      <div
        ref="thumb"
        class="stack-tab__scrollbar-thumb"
        :class="{ 'is-dragging': scrollDragging }"
        :style="{
          width: `${thumbWidth}px`,
          transform: `translateX(${thumbLeft}px)`
        }"
        @mousedown.prevent="handleScrollbarDragStart"
      />
    </div>
  </div>
  <tab-header-button
    v-if="isScrollButtonVisible"
    icon-class="stack-tab__icon-right-arrow"
    :disabled="isDisabledRightButton"
    @click="!isDisabledRightButton && handleScrollButtonClick(space!)"
  />
</template>

<script lang="ts" setup>
import { computed, ref, reactive, onMounted, watch, onUnmounted } from 'vue'
import { ResizeObserver } from '@juggle/resize-observer'
import type { ScrollData, DragData } from '@/lib/model/TabModel'
import {
  scrollTo as scrollToUtil,
  scrollIntoView as scrollIntoViewUtil
} from '@/lib/utils/scrollUtils'
import TabHeaderButton from '@/lib/components/TabHeader/TabHeaderButton.vue'

/** 标签列表滚动容器 */
const container = ref<HTMLElement | null>(null)
/** 滚动条轨道 */
const bar = ref<HTMLElement | null>(null)
/** 滚动条滑块 */
const thumb = ref<HTMLElement | null>(null)
/** 是否正在拖拽滚动条 */
const scrollDragging = ref<boolean>(false)
/** 左箭头是否禁用（已到最左） */
const isDisabledLeftButton = ref<boolean>(false)
/** 右箭头是否禁用（已到最右） */
const isDisabledRightButton = ref<boolean>(false)
/** 是否有横向滚动条（内容超出时显示左右箭头） */
const isScrollButtonVisible = ref<boolean>(true)
/** 外层滚动区域，用于 ResizeObserver */
const headerScroll = ref<HTMLElement>()
const props = withDefaults(
  defineProps<{
    /** 每次点击箭头或滚轮的移动距离（px） */
    space?: number
    /** 是否支持滚轮滚动 */
    isScrollWheel?: boolean
    /** 是否显示左右箭头 */
    isScrollButton?: boolean
  }>(),
  {
    space: 300,
    isScrollWheel: true,
    isScrollButton: true
  }
)
/** 滚动容器尺寸与滚动位置，用于计算滑块和按钮状态 */
const scrollData = reactive<ScrollData>({
  clientWidth: 0,
  scrollWidth: 0,
  scrollLeft: 0
})
/** 拖拽滚动条时的起始状态 */
const dragData = reactive<DragData>({
  thumbLeft: 0,
  startScrollLeft: 0,
  startThumbLeft: 0,
  startPageX: 0
})

/** 滚动数据变化时更新箭头与滚动条的启用状态 */
watch(scrollData, (data) => {
  updateScrollButtonState(data)
})

/** 根据滚动位置更新左右箭头禁用状态及滚动条可见性 */
const updateScrollButtonState = (data: ScrollData) => {
  isDisabledLeftButton.value = data.scrollLeft <= 10
  isDisabledRightButton.value =
    data.clientWidth + data.scrollLeft - data.scrollWidth >= -10
  isScrollButtonVisible.value = data.scrollWidth !== data.clientWidth
}

/** 内容是否超出容器宽度，需要显示滚动条 */
const hasScroller = computed<boolean>(() => {
  return scrollData.scrollWidth > scrollData.clientWidth
})

/** 滚动条滑块宽度（按内容比例计算） */
const thumbWidth = computed<number>(() => {
  if (!hasScroller.value) return 0

  const { clientWidth, scrollWidth } = scrollData
  return (clientWidth / scrollWidth) * clientWidth
})

/** 滚动条滑块 left 偏移（与 scrollLeft 对应） */
const thumbLeft = computed(() => {
  if (!hasScroller.value) return 0

  const { clientWidth, scrollWidth, scrollLeft } = scrollData

  return (clientWidth - thumbWidth.value) * (scrollLeft / (scrollWidth - clientWidth))
})

/** 更新滚动条数据 */
const updateScrollState = () => {
  if (!container.value) return
  const { clientWidth, scrollWidth, scrollLeft } = container.value
  Object.assign(scrollData, { clientWidth, scrollWidth, scrollLeft })
}

/** 确保激活的标签在可视区域内 */
const ensureActiveTabInView = () => {
  const activeTabEl = container.value?.querySelector('.stack-tab__item.is-active') as HTMLElement | null
  if (activeTabEl && !isInView(activeTabEl)) {
    scrollIntoView(activeTabEl)
  }
}

const scrollContainerResizeObserver = new ResizeObserver(() => {
  updateScrollState()
  ensureActiveTabInView()
})

const tabListResizeObserver = new ResizeObserver(() => {
  if (!hasScroller.value) ensureActiveTabInView()
  updateScrollState()
})
/** 滚动到指定 left 位置 */
const scrollTo = (left: number, smooth = true) => {
  scrollToUtil({ wrap: container.value, left, top: 0, smooth })
}

const handleScrollButtonClick = (delta: number) => {
  scrollTo(container.value!.scrollLeft + delta)
}

const handleWheelScroll = (e: WheelEvent) => {
  const isScrollUp = e.deltaY < 0
  scrollTo(container.value!.scrollLeft + (isScrollUp ? -props.space : props.space))
}

const handleScrollbarDragStart = (e: MouseEvent) => {
  Object.assign(dragData, {
    startPageX: e.pageX,
    startScrollLeft: container.value?.scrollLeft,
    startThumbLeft: thumbLeft.value,
    thumbLeft: thumbLeft.value
  })
  scrollDragging.value = true
  document.addEventListener('mousemove', handleScrollbarDragMove)
  document.addEventListener('mouseup', handleScrollbarDragEnd)
}

const handleScrollbarDragMove = (e: MouseEvent) => {
  const { clientWidth, scrollWidth } = scrollData
  let thumbLeft = dragData.startThumbLeft + e.pageX - dragData.startPageX
  const maxThumbLeft = clientWidth - thumbWidth.value

  if (thumbLeft < 0) {
    thumbLeft = 0
  } else if (thumbLeft > maxThumbLeft) {
    thumbLeft = maxThumbLeft
  }
  // 更新滑块定位
  dragData.thumbLeft = thumbLeft
  // 滚动
  scrollTo((thumbLeft * (scrollWidth - clientWidth)) / (clientWidth - thumbWidth.value), false)
  e.preventDefault()
}

const handleScrollbarDragEnd = () => {
  scrollDragging.value = false
  document.removeEventListener('mousemove', handleScrollbarDragMove)
  document.removeEventListener('mouseup', handleScrollbarDragEnd)
}

onMounted(() => {
  scrollContainerResizeObserver.observe(headerScroll.value as Element)
  const tabNav = container.value?.querySelector('.stack-tab__nav')
  tabListResizeObserver.observe(tabNav!)
})
onUnmounted(() => {
  scrollContainerResizeObserver.disconnect()
  tabListResizeObserver.disconnect()
})

const scrollIntoView = (el: HTMLElement) => {
  scrollIntoViewUtil({ el, wrap: container.value, block: 'end', inline: 'center' })
}

/** 判断元素是否在横向滚动可视区域内 */
const isInView = (el: HTMLElement) => {
  if (!hasScroller.value) {
    return true
  }
  const offsetLeft = el.offsetLeft
  const scrollLeft = container.value!.scrollLeft

  return !(
    offsetLeft < scrollLeft ||
    offsetLeft + el.clientWidth > scrollLeft + container.value!.clientWidth
  )
}

defineExpose({ scrollIntoView, isInView })
</script>

<style scoped></style>
