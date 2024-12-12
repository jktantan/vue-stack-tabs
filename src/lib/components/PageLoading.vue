<template>
  <div v-if="loading" class="stack-tab-loading-mask" :style="{zIndex: getMaxZIndex('.cache-page-wrapper *')}">
    <div class="stack-tab-loading--spin turn" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { MittType, useEmitter } from '../hooks/useTabMitt'
import { getMaxZIndex } from '../utils/TabScrollHelper'
const props = defineProps<{
  tId: string
}>()
const emitter = useEmitter()
const loading = ref<boolean>(false)
emitter.on(MittType.PAGE_LOADING, ({ tId, value }: any) => {
  if (tId === props.tId) {
    loading.value = value
  }
})
</script>
<style scoped></style>
