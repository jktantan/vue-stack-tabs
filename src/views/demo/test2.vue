<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useTabActions, useTabLoading, useTabRouter } from '@/lib'
import { useRoute } from 'vue-router'
const t = ref()
const { closeTabLoading } = useTabLoading()
const { addScrollTarget, backward } = useTabRouter()
const { reset, openTab } = useTabActions()
const route = useRoute()
onMounted(() => {
  // nextTick(() => {
  //   openTabLoading()
  // })
  addScrollTarget('.dsfsdfs')
  t.value = route.query.saa
  // setTimeout(()=>{
  //   closeTabLoading()
  // },10000)
})
const backto = () => {
  backward('/demo')
}
const resetTab = () => {
  reset()
}
const openIframeBridge = () => {
  openTab({
    title: 'IFrame Bridge 示例',
    path: '/iframe-bridge.html',
    iframe: true
  })
}
const openIframeNative = () => {
  openTab({
    title: 'IFrame Native 示例',
    path: '/iframe-child.html',
    iframe: true
  })
}
onUnmounted(() => {
  closeTabLoading()
})
</script>

<template>
  <el-button @click="backto">返回 </el-button>
  <el-button @click="resetTab">重置 </el-button>
  <el-button type="success" @click="openIframeBridge">打开 Bridge 示例 </el-button>
  <el-button type="warning" @click="openIframeNative">打开 Native 示例 </el-button>
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
