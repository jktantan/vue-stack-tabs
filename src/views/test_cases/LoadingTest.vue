<script setup lang="ts">
import { ref } from 'vue'
import { useTabLoading } from '@/lib'

const { openTabLoading, closeTabLoading } = useTabLoading()
const isLocalLoading = ref(false)

const triggerLoading = () => {
  openTabLoading()
  isLocalLoading.value = true
  setTimeout(() => {
    closeTabLoading()
    isLocalLoading.value = false
  }, 3000)
}
</script>

<template>
  <div class="test-page">
    <h2>Tab Loading 功能测试</h2>
    <el-card>
      <p>
        点击下方按钮，将调用 `openTabLoading` 打开 Tab 层级的 Loading 遮罩，3 秒后调用
        `closeTabLoading` 关闭。
      </p>

      <div style="margin-top: 20px">
        <el-button type="primary" :loading="isLocalLoading" @click="triggerLoading">
          {{ isLocalLoading ? '等待 3 秒...' : '开启 Tab Loading测试 (3秒)' }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
