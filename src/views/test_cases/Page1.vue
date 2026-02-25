<script setup lang="ts">
import { ref } from 'vue'

const inputVal = ref('')
const count = ref(0)
</script>

<template>
  <div class="test-page">
    <h2>页面 1 - 基础测试</h2>
    <el-card>
      <p>这是一个独立的测试页面，用于验证基础的切换和缓存生命周期。</p>
      <div style="margin: 20px 0">
        <span style="display: inline-block; width: 100px">输入框缓存:</span>
        <el-input
          v-model="inputVal"
          placeholder="请输入内容测试切走后是否保留"
          style="width: 300px"
        />
      </div>
      <div>
        <span style="display: inline-block; width: 100px">状态缓存:</span>
        <el-button @click="count++">点击增加: {{ count }}</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
