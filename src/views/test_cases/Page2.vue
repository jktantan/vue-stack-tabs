<script setup lang="ts">
import { ref } from 'vue'

const inputVal = ref('')
const time = ref(new Date().toLocaleTimeString())
</script>

<template>
  <div class="test-page">
    <h2>页面 2 - 独立内容测试</h2>
    <el-card>
      <p>初次加载时间: {{ time }}</p>
      <p>验证内容独立性，确保与 Page 1, 3, 4, 5 的渲染不同。</p>
      <div style="margin: 20px 0">
        <span style="display: inline-block; width: 100px">文本区域:</span>
        <el-input
          v-model="inputVal"
          type="textarea"
          placeholder="多行文本缓存测试"
          style="width: 300px"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
