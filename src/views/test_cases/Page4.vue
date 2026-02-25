<script setup lang="ts">
import { ref } from 'vue'

const selectVal = ref('')
const options = [
  { value: '选项1', label: '黄金糕' },
  { value: '选项2', label: '双皮奶' }
]
</script>

<template>
  <div class="test-page">
    <h2>页面 4 - 下拉菜单测试</h2>
    <el-card>
      <p>测试 Element Plus 下拉菜单的状态及其弹出层在切换后的表现。</p>
      <div style="margin: 20px 0">
        <el-select v-model="selectVal" placeholder="请选择" style="width: 240px">
          <el-option
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
