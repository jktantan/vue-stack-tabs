<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useStackTab, useTabLoading, useTabRouter } from '@/lib'
import { useRoute } from 'vue-router'
const t = ref()
const { openTabLoading, closeTabLoading } = useTabLoading()
const { addScroller, backward } = useTabRouter()
const { openNewTab,reset } = useStackTab()
const route = useRoute()
onMounted(() => {
  // nextTick(() => {
  //   openTabLoading()
  // })
  addScroller('.dsfsdfs')
  t.value = route.query.saa
  // setTimeout(()=>{
  //   closeTabLoading()
  // },10000)
})
const backto = () => {
  backward('/demo')
}
const resetTab=()=>{
  reset()
}
onUnmounted(() => {
  closeTabLoading()
})
</script>

<template>
  <el-button @click="backto">返回 </el-button>
  <el-button @click="resetTab">重置 </el-button>
  <div class="dsfsdfs">
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
