<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useTabRouter } from '@/lib'
const t = ref()
const { addScrollTarget } = useTabRouter()
onMounted(() => {
  nextTick(() => {
    // openTabLoading()
  })
  addScrollTarget('.dsfsdfs')
  // setTimeout(()=>{
  //   closeTabLoading()
  // },10000)
})
onUnmounted(() => {
  // closeTabLoading()
})
</script>

<template>
  <div>
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
    <el-input v-model="t" />
  </div>
</template>

<style scoped>
.dsfsdfs {
  height: 100%;
  overflow: auto;
}
</style>
