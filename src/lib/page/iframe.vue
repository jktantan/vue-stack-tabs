<script setup lang="ts" name="StackTabIframe">
import { useRoute } from 'vue-router'
import { useTabRouter } from '../hooks/useTabRouter'
const route = useRoute()
useTabRouter()

const url = computed({
  get: () => {
    const src = decodeURIComponent(route.query.__src as string)
    if (/^(javascript|data):/i.test(src)) {
      return 'about:blank'
    }
    return src
  }
})
onUnmounted(() => {
  console.log('iframe unmount')
})
</script>

<template>
  <!--  <iframe class="stack-tab__iframe" :src="url" frameborder="0" />-->
</template>

<style scoped lang="scss"></style>
