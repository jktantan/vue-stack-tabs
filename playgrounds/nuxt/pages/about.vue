<template>
  <div class="page">
    <h2>ℹ️ 关于页</h2>
    <p>这是一个独立的标签页。</p>
    <div class="actions">
      <button @click="forwardToDetail">Forward → 详情页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTabRouter } from 'vue-stack-tabs'
const { forward } = useTabRouter()
const forwardToDetail = () => {
  forward({ path: '/detail', query: { from: 'about' } })
}
</script>

<style scoped>
.page {
  padding: 24px;
}
.actions {
  display: flex;
  gap: 12px;
  margin: 16px 0;
}
.actions button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}
.actions button:hover {
  background: #f0f7ff;
  border-color: #409eff;
}
</style>
