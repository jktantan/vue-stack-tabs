<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useTabLoading } from 'vue-stack-tabs'
const t = ref()
const { openTabLoading, closeTabLoading } = useTabLoading()
onMounted(() => {
  nextTick(() => {
    openTabLoading()
  })

  // setTimeout(()=>{
  //   closeTabLoading()
  // },10000)
})
onUnmounted(() => {
  closeTabLoading()
})
</script>

<template>
  <div><el-input v-model="t" /></div>
</template>

<style scoped></style>
