<template>
  <tab-header-button
    v-if="isButtonVisibled"
    icon-class="stack-tab__icon-left-arrow"
    :disabled="isDisabledLeftButton"
    @click="!isDisabledLeftButton && onButton(-1 * space)"
  />
  <div ref="headerScroll" class="stack-tab__scroll" @wheel.passive="onWheel">
    <div
      ref="container"
      class="stack-tab__scroll-container"
      :class="{
        'stack-tab__shadow-inset-left': !isDisabledLeftButton && isDisabledRightButton,
        'stack-tab__shadow-inset-right': !isDisabledRightButton && isDisabledLeftButton,
        'stack-tab__shadow-inset-all': !isDisabledLeftButton && !isDisabledRightButton
      }"
      @scroll.passive="update"
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
        @mousedown.prevent="onDragStart"
      />
    </div>
  </div>
  <tab-header-button
    v-if="isButtonVisibled"
    icon-class="stack-tab__icon-right-arrow"
    :disabled="isDisabledRightButton"
    @click="!isDisabledRightButton && onButton(space!)"
  />
</template>

<script lang="ts" setup>
import { computed, ref, reactive, onMounted, watch, onUnmounted } from 'vue'
import { ResizeObserver } from '@juggle/resize-observer'
import type { ScrollData, DragData } from '@/lib/model/TabModel'
import { _scrollTo, _scrollIntoView } from '@/lib/utils/TabScrollHelper'
import TabHeaderButton from '@/lib/components/TabHeader/TabHeaderButton.vue'

// ref
const container = ref<HTMLElement | null>(null)
const bar = ref<HTMLElement | null>(null)
const thumb = ref<HTMLElement | null>(null)
const scrollDragging = ref<boolean>(false)
const isDisabledLeftButton = ref<boolean>(false)
const isDisabledRightButton = ref<boolean>(false)
const isButtonVisibled = ref<boolean>(true)
const headerScroll = ref<HTMLElement>()
const props = withDefaults(
  defineProps<{
    // 每次移动距离
    space?: number
    isScrollWheel?: boolean
    isScrollButton?: boolean
  }>(),
  {
    space: 300,
    isScrollWheel: true,
    isScrollButton: true
  }
)
/**
 * 滚动条数据
 */
const scrollData = reactive<ScrollData>({
  clientWidth: 0,
  scrollWidth: 0,
  scrollLeft: 0
})
const dragData = reactive<DragData>({
  thumbLeft: 0,
  startScrollLeft: 0,
  startThumbLeft: 0,
  startPageX: 0
})

// 监控滚动条数据用于启用/禁用按钮
watch(scrollData, (newValue) => {
  setScrollButton(newValue)
})

const setScrollButton = (scrollData: ScrollData) => {
  isDisabledLeftButton.value = scrollData.scrollLeft <= 10
  isDisabledRightButton.value =
    scrollData.clientWidth + scrollData.scrollLeft - scrollData.scrollWidth >= -10
  isButtonVisibled.value = scrollData.scrollWidth !== scrollData.clientWidth
}

// 计算属性
// 是否拥有滚动条
const hasScroller = computed<boolean>(() => {
  return scrollData.scrollWidth > scrollData.clientWidth
})

// 滑块宽度
const thumbWidth = computed<number>(() => {
  if (!hasScroller.value) return 0

  const { clientWidth, scrollWidth } = scrollData
  return (clientWidth / scrollWidth) * clientWidth
})

// 滑块 left
const thumbLeft = computed(() => {
  if (!hasScroller.value) return 0

  const { clientWidth, scrollWidth, scrollLeft } = scrollData

  return (clientWidth - thumbWidth.value) * (scrollLeft / (scrollWidth - clientWidth))
})

// 方法
// 更新滚动数据
const update = () => {
  // 判断 container是否为空，主空直接返回
  if (container.value === null || container.value === undefined) {
    return
  }
  const { clientWidth, scrollWidth, scrollLeft } = container.value

  Object.assign(scrollData, { clientWidth, scrollWidth, scrollLeft })
}
const resizeUpdate = new ResizeObserver(() => {
  update()
  const cur = container.value?.querySelector('.stack-tab__item.is-active')
  if (cur) {
    if (!isInView(cur as HTMLElement)) {
      scrollIntoView(cur as HTMLElement)
    }
  }
})
const tabsUpdate = new ResizeObserver(() => {
  if (!hasScroller.value) {
    const cur = container.value?.querySelector('.stack-tab__item.is-active')
    if (cur) {
      if (!isInView(cur as HTMLElement)) {
        scrollIntoView(cur as HTMLElement)
      }
    }
  }
  update()
})
// 滚动到指定位置
const scrollTo = (left: number, smooth = true) => {
  _scrollTo({ wrap: container.value, left, smooth })
}

const onButton = (space: number) => {
  scrollTo(container.value!.scrollLeft + space)
}
// 页签鼠标滚动
const onWheel = (e: WheelEvent) => {
  const isWheelUp = e.deltaY < 0
  scrollTo(container.value!.scrollLeft + (isWheelUp ? -props.space : props.space))
}
// 拖拽
const onDragStart = (e: MouseEvent) => {
  Object.assign(dragData, {
    startPageX: e.pageX,
    startScrollLeft: container.value?.scrollLeft,
    startThumbLeft: thumbLeft.value,
    thumbLeft: thumbLeft.value
  })
  scrollDragging.value = true
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}

// 拖拽移动
const onDragMove = (e: MouseEvent) => {
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
// 拖拽结束
const onDragEnd = (e: MouseEvent) => {
  scrollDragging.value = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)

  e.preventDefault()
}
onMounted(() => {
  resizeUpdate.observe(headerScroll.value as Element)
  const tabNav = container.value?.querySelector('.stack-tab__nav')
  tabsUpdate.observe(tabNav!)
})
onUnmounted(() => {
  resizeUpdate.disconnect()
  tabsUpdate.disconnect()
})

// 滚动到元素
const scrollIntoView = (el: HTMLElement) => {
  _scrollIntoView({ el, wrap: container, block: 'end', inline: 'center' })
}

// 判断子节点是否完全在可视区域
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
