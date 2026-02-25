<script setup lang="ts">
import { useTabRouter } from '@/lib'
const { forward } = useTabRouter()
</script>

<template>
  <div class="test-page">
    <h2>多组件 URL 回退测试 - 入口 (Home 组件)</h2>
    <el-card>
      <p>这是一个专门的测试链条，由三个完全不同的视图组件构成。</p>
      <p>当前节点：<el-tag type="info">Home 组件</el-tag></p>

      <div style="margin-top: 20px">
        <el-button
          type="primary"
          @click="forward({ path: '/demo/url-test/home', query: { loop: 1 } })"
          >循环 Push 自己 (可选)</el-button
        >
        <el-button
          type="success"
          @click="forward({ path: '/demo/url-test/a', query: { from: 'home' } })"
          >前进到【组件 A】</el-button
        >
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
