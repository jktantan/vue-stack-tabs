<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useTabLoading, useTabRouter } from '@/lib'
import { useRoute } from 'vue-router'
const t = ref()
const { openTabLoading, closeTabLoading } = useTabLoading()
const { addScroller } = useTabRouter()
const route = useRoute()
onMounted(() => {
  nextTick(() => {
    // openTabLoading()
  })
  addScroller('.dsfsdfs')
  t.value = route.query.saa
  // setTimeout(()=>{
  //   closeTabLoading()
  // },10000)
})
onUnmounted(() => {
  // closeTabLoading()
})
</script>

<template>
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
