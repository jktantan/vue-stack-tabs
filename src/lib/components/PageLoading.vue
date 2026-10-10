<!--
  PageLoading - 页面加载遮罩

  职责：监听 PAGE_LOADING 事件，按 tabId 显示/隐藏 loading 遮罩
  使用：在 useTabPanel 的 cache 组件内按 tab 渲染
-->
<template>
  <div
    v-if="isLoading"
    class="stack-tab-loading-mask"
    role="status"
    aria-live="polite"
    :aria-label="t('VueStackTab.loading')"
    :style="{ zIndex: loadingZIndex() }"
  >
    <div class="stack-tab-loading--spin turn" aria-hidden="true" />
  </div>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import { TabEventType, useTabEmitter } from '../hooks/useTabEventBus'
import { getMaxZIndex, invalidateZIndexCache } from '../utils/scrollUtils'

/**
 * loading 遮罩每次显隐都会改变 .cache-page-wrapper 子树层叠，先失效缓存再读取避免旧值。
 */
const loadingZIndex = () => {
  invalidateZIndexCache('.cache-page-wrapper *')
  return getMaxZIndex('.cache-page-wrapper *')
}
const props = defineProps<{
  /** 当前标签 id，用于过滤 PAGE_LOADING 事件 */
  tabId: string
}>()
const { t } = useI18n()
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
