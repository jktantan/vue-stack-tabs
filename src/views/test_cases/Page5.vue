<script setup lang="ts">
import { ref } from 'vue'

const switchVal = ref(true)
const sliderVal = ref(50)
</script>

<template>
  <div class="test-page">
    <h2>页面 5 - 更多组件测试</h2>
    <el-card>
      <p>测试开关和滑块控件的缓存恢复情况。</p>
      <div style="margin: 20px 0">
        <el-switch v-model="switchVal" active-text="开启" inactive-text="关闭" />
      </div>
      <div style="margin: 20px 0; width: 300px">
        <el-slider v-model="sliderVal" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
