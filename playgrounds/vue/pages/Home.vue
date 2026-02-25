<template>
  <div class="page">
    <h2>🏠 首页</h2>
    <p>vue-stack-tabs Playground — 可在此处测试标签内页内导航。</p>
    <div class="actions">
      <button @click="openAbout">打开「关于」标签</button>
      <button @click="forwardToDetail">Forward → 详情页</button>
      <button @click="forwardToSelf">循环 Push 自己</button>
    </div>
    <p class="info">栈深度：每次 Forward 都会压入新的缓存实例。</p>
  </div>
</template>

<script setup lang="ts">
import { useTabActions, useTabRouter } from 'vue-stack-tabs'

const { openTab } = useTabActions()
const { forward } = useTabRouter()

const openAbout = () => {
  openTab({ id: 'about', title: '关于', path: '/about' })
}

const forwardToDetail = () => {
  forward({ path: '/detail', query: { id: String(Date.now()) } })
}

const forwardToSelf = () => {
  forward({ path: '/', query: { loop: String(Date.now()) } })
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
.info {
  color: #999;
  font-size: 13px;
}
</style>
