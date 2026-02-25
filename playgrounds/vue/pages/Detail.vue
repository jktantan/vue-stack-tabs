<template>
  <div class="page">
    <h2>📄 详情页</h2>
    <p>
      路由参数：<code>{{ route.query }}</code>
    </p>
    <p>
      后退参数：<code>{{ _back ?? '无' }}</code>
    </p>
    <div class="actions">
      <button @click="backward(1)">← 后退 1 步</button>
      <button @click="backward('/')">← 回退到首页</button>
      <button @click="backward('/', { result: 'ok' })">← 带参回退到首页</button>
      <button @click="forwardDeeper">Forward → 更深一层</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useTabRouter } from 'vue-stack-tabs'

defineProps<{ _back?: Record<string, unknown> }>()

const route = useRoute()
const { forward, backward } = useTabRouter()

const forwardDeeper = () => {
  forward({ path: '/detail', query: { id: String(Date.now()), depth: 'deeper' } })
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
  flex-wrap: wrap;
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
code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
