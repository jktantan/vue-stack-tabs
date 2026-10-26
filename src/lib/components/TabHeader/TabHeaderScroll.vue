<!--
  TabHeaderScroll - 可横向滚动的标签栏容器

  职责：左右箭头滚动、滚轮滚动、自定义滚动条拖拽、确保激活标签在可视区域内

  滚动条是自绘的：原生滚动条隐藏，滚动位置通过 scrollLeft 驱动。
  滚动过程中滑块位置直接写 DOM（不经过响应式），避免每帧触发组件重渲染、
  进而重新执行 slot 并 patch 整个标签列表。
-->
<template>
  <tab-header-button
    v-if="isScrollButtonVisible"
    icon-class="stack-tab__icon stack-tab__icon--left-arrow"
    :disabled="isDisabledLeftButton"
    :title="t('VueStackTab.scrollLeft')"
    :aria-label="t('VueStackTab.scrollLeft')"
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
      :class="{ 'stack-tab__scrollbar--dragging': scrollDragging }"
    >
      <div
        ref="thumb"
        class="stack-tab__scrollbar-thumb"
        :class="{ 'stack-tab__scrollbar-thumb--dragging': scrollDragging }"
        @pointerdown.prevent="handleScrollbarDragStart"
        @pointermove="handleScrollbarDragMove"
        @pointerup="handleScrollbarDragEnd"
        @pointercancel="handleScrollbarDragEnd"
        @lostpointercapture="handleScrollbarDragEnd"
      />
    </div>
  </div>
  <tab-header-button
    v-if="isScrollButtonVisible"
    icon-class="stack-tab__icon stack-tab__icon--right-arrow"
    :disabled="isDisabledRightButton"
    :title="t('VueStackTab.scrollRight')"
    :aria-label="t('VueStackTab.scrollRight')"
    @click="!isDisabledRightButton && handleScrollButtonClick(space!)"
  />
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n-lite'
import { ref, onMounted, watch, onUnmounted } from 'vue'
import type { ScrollData } from '../../model/TabModel'
import {
  scrollTo as scrollToUtil,
  scrollIntoView as scrollIntoViewUtil
} from '../../utils/scrollUtils'
import TabHeaderButton from './TabHeaderButton.vue'

const { t } = useI18n()

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
/** 是否显示左右滚动按钮：必须启用按钮模式且内容横向溢出 */
const isScrollButtonVisible = ref<boolean>(false)
/** 内容是否超出容器宽度，需要显示滚动条 */
const hasScroller = ref<boolean>(false)
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

/**
 * 滚动容器的尺寸与位置。
 * 刻意保持非响应式：滚动时每帧更新它，若走 reactive 会触发组件重渲染。
 */
const scrollData: ScrollData = {
  clientWidth: 0,
  scrollWidth: 0,
  scrollLeft: 0
}

/** 拖拽起始状态（非响应式，避免 pointermove 触发渲染） */
const dragData = {
  startPageX: 0,
  startThumbLeft: 0
}
/** 拖拽指针位置与 rAF 句柄，用于合并高频 pointermove */
let dragRafId = 0
let pendingPageX = 0
let capturedPointerId: number | null = null

/** 滚动条滑块宽度（按内容比例计算） */
const getThumbWidth = (): number => {
  const { clientWidth, scrollWidth } = scrollData
  if (scrollWidth <= clientWidth || scrollWidth === 0) return 0

  return (clientWidth / scrollWidth) * clientWidth
}

/** 滚动条滑块 left 偏移（与 scrollLeft 对应） */
const getThumbLeft = (scrollLeft: number): number => {
  const { clientWidth, scrollWidth } = scrollData
  const maxScrollLeft = scrollWidth - clientWidth
  if (maxScrollLeft <= 0) return 0

  return (clientWidth - getThumbWidth()) * (scrollLeft / maxScrollLeft)
}

/**
 * 直接写滑块样式，绕过模板绑定。
 * 这是滚动路径上唯一的 DOM 写入，不触发组件重渲染。
 */
const updateThumb = (scrollLeft: number) => {
  const thumbEl = thumb.value
  if (!thumbEl || !hasScroller.value) return

  thumbEl.style.width = `${getThumbWidth()}px`
  thumbEl.style.transform = `translateX(${getThumbLeft(scrollLeft)}px)`
}

/** 根据滚动位置更新左右箭头禁用状态 */
const updateScrollButtonState = () => {
  isDisabledLeftButton.value = scrollData.scrollLeft <= 10
  isDisabledRightButton.value =
    scrollData.clientWidth + scrollData.scrollLeft - scrollData.scrollWidth >= -10
}

/** 更新溢出判断与滚动按钮可见性 */
const updateScrollVisibility = () => {
  hasScroller.value = scrollData.scrollWidth > scrollData.clientWidth
  isScrollButtonVisible.value = props.isScrollButton && hasScroller.value
}

/**
 * 同步容器尺寸与滚动位置。
 * scroll 与 ResizeObserver 共用：尺寸只在滚动时顺带读取，不写入响应式状态，
 * 因此不会触发组件重渲染。
 */
const updateScrollState = () => {
  const el = container.value
  if (!el) return

  scrollData.clientWidth = el.clientWidth
  scrollData.scrollWidth = el.scrollWidth
  scrollData.scrollLeft = el.scrollLeft
  updateScrollVisibility()
  updateScrollButtonState()
  updateThumb(scrollData.scrollLeft)
}

/** 确保激活的标签在可视区域内 */
const ensureActiveTabInView = () => {
  const activeTabEl = container.value?.querySelector(
    '.stack-tab__item--active'
  ) as HTMLElement | null
  if (activeTabEl && !isInView(activeTabEl)) {
    scrollIntoView(activeTabEl)
  }
}

let scrollContainerResizeObserver: ResizeObserver | null = null
let tabListResizeObserver: ResizeObserver | null = null
/** 上一次观察到的标签数量，用于区分“标签增删”和普通的尺寸抖动 */
let lastTabCount = 0
/** 滚动到指定 left 位置 */
const scrollTo = (left: number, smooth = true) => {
  scrollToUtil({ wrap: container.value, left, top: 0, smooth })
}

const handleScrollButtonClick = (delta: number) => {
  scrollTo(container.value!.scrollLeft + delta)
}

const handleWheelScroll = (e: WheelEvent) => {
  if (!props.isScrollWheel || !container.value) return
  // 触控板横向手势交给原生滚动，避免与下面的定距滚动叠加
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  if (!e.deltaY) return

  const isScrollUp = e.deltaY < 0
  scrollTo(container.value.scrollLeft + (isScrollUp ? -props.space : props.space))
}

/** 应用一次拖拽位移（在 rAF 中执行，合并高频 pointermove） */
const applyDrag = () => {
  dragRafId = 0
  if (!scrollDragging.value || !container.value) return

  const { clientWidth, scrollWidth } = scrollData
  const maxScrollLeft = scrollWidth - clientWidth
  const maxThumbLeft = clientWidth - getThumbWidth()
  if (maxScrollLeft <= 0 || maxThumbLeft <= 0) return

  const thumbLeft = Math.min(
    Math.max(dragData.startThumbLeft + pendingPageX - dragData.startPageX, 0),
    maxThumbLeft
  )

  // 同步滚动与滑块位置，拖拽跟手，不依赖异步 scroll 事件
  scrollToUtil({
    wrap: container.value,
    left: (thumbLeft * maxScrollLeft) / maxThumbLeft,
    top: 0,
    smooth: false
  })
  if (thumb.value) {
    thumb.value.style.transform = `translateX(${thumbLeft}px)`
  }
}

const handleScrollbarDragStart = (e: PointerEvent) => {
  const thumbEl = thumb.value
  const isPrimaryButton = e.pointerType !== 'mouse' || e.button === 0
  if (!thumbEl || !isPrimaryButton) return

  const scrollLeft = container.value?.scrollLeft ?? 0
  dragData.startPageX = e.pageX
  dragData.startThumbLeft = getThumbLeft(scrollLeft)
  pendingPageX = e.pageX
  scrollDragging.value = true
  capturedPointerId = e.pointerId
  thumbEl.setPointerCapture?.(e.pointerId)
}

const handleScrollbarDragMove = (e: PointerEvent) => {
  if (!scrollDragging.value) return

  pendingPageX = e.pageX
  if (dragRafId) return
  dragRafId = requestAnimationFrame(applyDrag)
}

const handleScrollbarDragEnd = () => {
  if (dragRafId) {
    cancelAnimationFrame(dragRafId)
    dragRafId = 0
  }
  scrollDragging.value = false

  const pointerId = capturedPointerId
  capturedPointerId = null
  const thumbEl = thumb.value
  if (thumbEl && pointerId !== null && thumbEl.hasPointerCapture?.(pointerId)) {
    thumbEl.releasePointerCapture(pointerId)
  }
}

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    scrollContainerResizeObserver = new ResizeObserver(() => {
      updateScrollState()
      ensureActiveTabInView()
    })
    tabListResizeObserver = new ResizeObserver(() => {
      // 只有标签增删（数量变化）才需要纠正滚动位置。
      // hover 展开关闭按钮、标题动态变化等也会改变列表宽度并触发本回调，
      // 若此时无条件 ensureActiveTabInView，会把用户主动滚开的标签栏强行拉回 active 标签。
      const tabCount = container.value?.querySelectorAll('.stack-tab__item').length ?? 0
      const tabCountChanged = tabCount !== lastTabCount
      lastTabCount = tabCount

      if (hasScroller.value && tabCountChanged) ensureActiveTabInView()
      updateScrollState()
    })

    if (headerScroll.value) scrollContainerResizeObserver.observe(headerScroll.value)
    const tabNav = container.value?.querySelector('.stack-tab__nav')
    lastTabCount = container.value?.querySelectorAll('.stack-tab__item').length ?? 0
    if (tabNav) tabListResizeObserver.observe(tabNav)
  }

  updateScrollState()
})
onUnmounted(() => {
  handleScrollbarDragEnd()
  scrollContainerResizeObserver?.disconnect()
  tabListResizeObserver?.disconnect()
  scrollContainerResizeObserver = null
  tabListResizeObserver = null
})

watch(
  () => props.isScrollButton,
  () => {
    isScrollButtonVisible.value = props.isScrollButton && hasScroller.value
  }
)

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
