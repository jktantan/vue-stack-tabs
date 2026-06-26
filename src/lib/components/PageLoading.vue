<!--
  PageLoading - 页面加载遮罩

  职责：监听 PAGE_LOADING 事件，按 tabId 显示/隐藏 loading 遮罩
  使用：在 useTabPanel 的 cache 组件内按 tab 渲染
-->
<template>
  <div
    v-if="isLoading"
    class="stack-tab-loading-mask"
    :style="{ zIndex: getMaxZIndex('.cache-page-wrapper *') }"
  >
    <div class="stack-tab-loading--spin turn" />
  </div>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { TabEventType, useTabEmitter } from '../hooks/useTabEventBus'
import { getMaxZIndex } from '../utils/scrollUtils'
const props = defineProps<{
  /** 当前标签 id，用于过滤 PAGE_LOADING 事件 */
  tabId: string
}>()
const emitter = useTabEmitter()
/** 是否显示 loading 遮罩 */
const isLoading = ref<boolean>(false)
/** 处理 PAGE_LOADING 事件，仅当 tId 匹配时更新 */
const handleLoadingEvent = (payload: { tId: string; value: boolean }) => {
  if (payload.tId === props.tabId) {
    isLoading.value = payload.value
  }
}
emitter.on(TabEventType.PAGE_LOADING, handleLoadingEvent)
onUnmounted(() => {
  emitter.off(TabEventType.PAGE_LOADING, handleLoadingEvent)
})
</script>
<style scoped></style>
