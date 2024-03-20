<script setup lang="ts">
import { useTabRouter } from '@/lib'
import { onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
const { forward, addScroller } = useTabRouter()
const router = useRouter()
const props = defineProps<{
  tId: string
  pId: string
}>()
const iTest = ref<string>('')
onActivated(() => {
  console.log('on Demo Index activate')
})
onMounted(() => {
  console.log('on Demo Index mount')
  // console.log(props)
  addScroller('.aaaaaa')
})
const goto = () => {
  router.push({
    path: '/other'
  })
}
</script>
<script lang="ts">
export default {
  name: 'demoIndex'
}
</script>
<template>
  <div><el-input v-model="iTest" /> <el-button @click="goto">跳转测试</el-button></div>
</template>

<style scoped></style>
