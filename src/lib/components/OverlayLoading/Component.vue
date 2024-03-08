<template>
  <transition :name="transition">
    <div
      tabindex="0"
      class="vl-overlay vl-active"
      :class="{ 'vl-full-page': isFullPage }"
      v-show="isActive"
      :aria-busy="isActive"
      aria-label="Loading"
      :style="{ zIndex }"
      ref="overlay"
    >
      <div class="vl-background" @click.prevent="cancel" :style="bgStyle" />
      <div class="vl-icon">
        <slot name="before" />
        <slot name="default">
          <component :is="Loaders[loader]" :color="color" :width="width" :height="height" />
        </slot>
        <slot name="after" />
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
// @ts-nocheck
import {
  defineProps,
  withDefaults,
  render,
  ref,
  onMounted,
  onBeforeUnmount,
  computed,
  watch
} from 'vue'
import { removeElement } from './helpers'
import Loaders from './loaders'

const props = withDefaults(
  defineProps<{
    active: boolean
    programmatic: boolean
    container: HTMLElement | Object | Function
    isFullPage: boolean
    enforceFocus?: boolean
    lockScroll: boolean
    transition: string
    /**
     * Allow user to hide the loader
     */
    canCancel: boolean
    /**
     * Do something on cancel
     */
    onCancel: Function
    color: string
    backgroundColor: string
    opacity: number
    width: number
    height: number
    zIndex: number
    loader: string
  }>(),
  {
    isFullPage: true,
    enforceFocus: true,
    transition: 'fade',
    onCancel: () => {},
    loader: 'spinner'
  }
)
const overlay = ref<HTMLDivElement>()
const isActive = ref<boolean>(props.active)
const emit = defineEmits(['hide', 'update:active'])
/**
 * Proxy to hide() method.
 * Gets called by ESC button or when click outside
 */
const cancel = () => {
  if (!props.canCancel || !isActive.value) return
  hide()
  props.onCancel.apply(null, null)
}
/**
 * Hide and destroy component if it's programmatic.
 */
const hide = () => {
  emit('hide')
  emit('update:active', false)

  if (props.programmatic) {
    isActive.value = false

    // Timeout for the animation complete before destroying
    setTimeout(() => {
      const parent = overlay.value!.parentElement
      // unmount the component
      render(null, parent!)
      removeElement(parent)
    }, 150)
  }
}
const disableScroll = () => {
  if (props.isFullPage && props.lockScroll) {
    document.body.classList.add('vl-shown')
  }
}
const enableScroll = () => {
  if (props.isFullPage && props.lockScroll) {
    document.body.classList.remove('vl-shown')
  }
}
/**
 * Key press event to hide on ESC.
 */
const keyPress = (event: KeyboardEvent) => {
  // todo keyCode is deprecated
  if (event.code === 'Escape') cancel()
}

const focusIn = (event: FocusEvent) => {
  // Ignore when loading is not active
  if (!isActive.value) return

  if (
    // Event target is the loading div element itself
    event.target === overlay.value ||
    // Event target is inside the loading div
    // @ts-ignore
    overlay.value!.contains(event.target)
  )
    return

  // Use container as parent when available otherwise use parent element when isFullPage is false
  const parent = props.container
    ? props.container
    : props.isFullPage
      ? null
      : overlay.value!.parentElement

  if (
    // Always prevent when loading is full screen
    props.isFullPage ||
    // When a parent exist means loader is running inside a container
    // When loading is NOT full screen and event target is inside the given container
    // @ts-ignore
    (parent && parent.contains(event.target))
  ) {
    event.preventDefault()
    overlay.value!.focus()
  }
}

const bgStyle = computed(() => {
  return {
    background: props.backgroundColor,
    opacity: props.opacity
  }
})
watch(
  () => props.active,
  (value) => {
    isActive.value = value
  }
)
watch(
  () => isActive,
  (value) => {
    if (value) {
      disableScroll()
    } else {
      enableScroll()
    }
  }
)

onMounted(() => {
  if (props.enforceFocus) {
    document.addEventListener('focusin', focusIn)
  }
  document.addEventListener('keyup', keyPress)
})
onBeforeUnmount(() => {
  document.removeEventListener('keyup', keyPress)
  document.removeEventListener('focusin', focusIn)
})
defineExpose({
  hide
})
</script>
