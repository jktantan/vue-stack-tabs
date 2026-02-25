<script setup lang="ts">
import { useTabActions, useTabRouter } from '@/lib'
import { onActivated, onMounted, ref } from 'vue'
const { addScrollTarget, forward } = useTabRouter()
const { reset } = useTabActions()
const iTest = ref<string>('')
onActivated(() => {
  console.log('on Demo Index activate')
})
onMounted(() => {
  console.log('on Demo Index mount')
  // console.log(props)
  addScrollTarget('.aaaaaa')
})
const goto = () => {
  forward({
    path: '/demo/test2'
  })
}

const resetTest = () => {
  // openTab(
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
  name: 'DemoIndex'
}
</script>
<template>
  <div>
    <el-input v-model="iTest" /> <el-button @click="goto">跳转测试</el-button>
    <el-button @click="resetTest">重置</el-button>
  </div>
</template>

<style scoped></style>
