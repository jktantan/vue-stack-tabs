<script setup lang="ts">
import { onMounted, ref } from 'vue'
import useTabLoading from '@/lib/hooks/useTabLoading'
const t = ref()
const { openTabLoading,closeTabLoading} = useTabLoading()
onMounted(()=>{
  openTabLoading()
  setTimeout(()=>{
    closeTabLoading()
  },10000)
})

</script>

<template>
  <div><el-input v-model="t" /></div>
</template>

<style scoped></style>
