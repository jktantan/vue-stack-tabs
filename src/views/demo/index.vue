<script setup lang="ts">
import { useTabRouter, useStackTab } from '@/lib'
import { onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
const { addScroller, forward, backward } = useTabRouter()
const { openNewTab,reset } = useStackTab()
const router = useRouter()
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
  forward({
    path: '/404'
  })
}

const resetTest = () => {
  // openNewTab(
  //   {
  //     id: 'SearchFormPreview',
  //     title: '查询预览',
  //     path: `/demo/test3`,
  //   },
  //   true
  // )
  reset()
}
</script>
<script lang="ts">
export default {
  name: 'demoIndex'
}
</script>
<template>
  <div>
    <el-input v-model="iTest" /> <el-button @click="goto">跳转测试</el-button>
    <el-button @click="resetTest">重置</el-button>
  </div>
</template>

<style scoped></style>
