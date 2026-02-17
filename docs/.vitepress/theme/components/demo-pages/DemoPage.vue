<template>
  <div class="demo-page">
    <h1>📄 页面 {{ id }}</h1>
    <p>这是一个动态生成的页面，用于演示标签管理功能。</p>
    <div class="info">当前标签 ID: <code>page-{{ id }}</code></div>
    <div class="demo-content">
      <p>您可以：</p>
      <ul>
        <li>右键点击标签查看菜单</li>
        <li>关闭左侧/右侧/其他标签</li>
        <li>刷新当前标签</li>
        <li>切换到其他标签</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const id = computed(() => route.params.id || '0')
</script>

<style scoped>
.demo-page {
  padding: 40px;
}

h1 {
  color: #667eea;
  margin-bottom: 16px;
}

code {
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.demo-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-top: 24px;
}

ul {
  margin-top: 16px;
}

li {
  line-height: 2;
  color: #555;
}
</style>
