<script setup lang="ts">
import { ref } from 'vue'

const checked = ref(false)
const radio = ref('1')
</script>

<template>
  <div class="test-page">
    <h2>页面 3 - 表单控件测试</h2>
    <el-card>
      <p>测试不同类型的表单控件缓存。</p>
      <div style="margin: 20px 0">
        <el-checkbox v-model="checked">选项缓存测试</el-checkbox>
      </div>
      <div style="margin: 20px 0">
        <el-radio-group v-model="radio">
          <el-radio label="1">选项 A</el-radio>
          <el-radio label="2">选项 B</el-radio>
        </el-radio-group>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
