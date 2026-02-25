<script setup lang="ts">
import { ref } from 'vue'

const items = ref(Array.from({ length: 50 }, (_, i) => `滚动测试数据第 ${i + 1} 项`))
</script>

<template>
  <div class="test-page">
    <h2>高长内容滚动条缓存测试</h2>
    <el-card>
      <p>
        向下滚动页面，至少滚动到一半。然后切换到其他页签，再切换回来。滚动条的位置应精准保持在原处！
      </p>
      <div
        style="
          height: 1500px;
          margin-top: 30px;
          background: linear-gradient(to bottom, #f0f9eb, #c6e2ff);
          padding: 40px;
        "
      >
        <ul>
          <li
            v-for="item in items"
            :key="item"
            style="padding: 15px; border-bottom: 1px solid #ccc"
          >
            {{ item }}
          </li>
        </ul>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
