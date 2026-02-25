<template>
  <div class="demo-page">
    <h1>🔗 嵌套路由演示</h1>
    <p>演示在同一个标签内的前进和后退导航。</p>
    
    <div class="nested-nav">
      <button class="btn" @click="goHome">首页 Home</button>
      <button class="btn" @click="goDetail(1)">详情 1</button>
      <button class="btn" @click="goDetail(2)">详情 2</button>
      <button class="btn" @click="goDetail(3)">详情 3</button>
    </div>
    
    <div class="nested-content">
      <h2>嵌套路由主页</h2>
      <p>点击上方按钮可以在同一个标签内导航到不同的子页面。</p>
      <p>这个功能适用于需要在标签内保持导航历史的场景，比如：</p>
      <ul>
        <li>列表 → 详情 → 编辑</li>
        <li>目录 → 文章 → 评论</li>
        <li>产品分类 → 产品列表 → 产品详情</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import useTabRouter from '../../../../../src/lib/hooks/useTabRouter'

const { forward } = useTabRouter()

const goHome = () => {
  // 这里可以使用 forward 导航到嵌套路由
  console.log('导航到首页')
}

const goDetail = (id: number) => {
  console.log(`导航到详情 ${id}`)
}
</script>

<style scoped>
.demo-page {
  padding: 40px;
}

h1 {
  color: #667eea;
  margin-bottom: 16px;
}

.nested-nav {
  display: flex;
  gap: 12px;
  margin: 24px 0;
  flex-wrap: wrap;
}

.nested-nav .btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.nested-nav .btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.nested-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-top: 24px;
}

.nested-content h2 {
  color: #333;
  margin-bottom: 16px;
}

.nested-content p {
  line-height: 1.8;
  color: #555;
  margin: 12px 0;
}

.nested-content ul {
  margin-top: 12px;
  padding-left: 20px;
}

.nested-content li {
  line-height: 2;
  color: #555;
}
</style>
