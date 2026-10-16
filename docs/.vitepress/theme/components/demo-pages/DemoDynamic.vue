<template>
  <div class="demo-page">
    <h1>🎲 动态标签 {{ num }}</h1>
    <p>
      这是一个动态创建的标签，随机数是: <strong>{{ num }}</strong>
    </p>

    <div class="dynamic-content">
      <div class="random-display">{{ num }}</div>
      <p>每次点击"动态标签"按钮都会创建一个新的标签，具有唯一的 ID 和随机数。</p>
      <p>这个功能适用于需要动态创建内容的场景，比如：</p>
      <ul>
        <li>搜索结果页</li>
        <li>临时工作区</li>
        <li>多文档编辑</li>
        <li>即时创建的任务</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const num = computed(() => route.params.num || '0')
</script>

<style scoped>
.demo-page {
  padding: 40px;
  text-align: center;
}

h1 {
  color: #667eea;
  margin-bottom: 16px;
}

.dynamic-content {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-top: 32px;
}

.random-display {
  font-size: 72px;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 20px 0;
}

.dynamic-content p {
  text-align: left;
  line-height: 1.8;
  color: #555;
  margin: 16px 0;
}

.dynamic-content ul {
  text-align: left;
  margin-top: 12px;
  padding-left: 20px;
}

.dynamic-content li {
  line-height: 2;
  color: #555;
}
</style>
