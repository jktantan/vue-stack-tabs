<script setup lang="ts">
import useTabRouter from '@/lib/hooks/useTabRouter'
import { onActivated, onMounted, ref } from 'vue'
useTabRouter()
const iTest = ref<string>('')
onActivated(() => {
  console.log('on Demo Index activate')
})
onMounted(() => {
  console.log('on Demo Index mount')
})
</script>
<script lang="ts">
export default {
  name: 'demoIndex'
}
</script>
<template>
  <div><el-input v-model="iTest" /></div>
</template>

<style scoped></style>
