<!--
  Test2Layout - 子路由父级布局（试验性）

  职责：作为 /demo/subroute 的父组件，提供 router-view 渲染子路由
  说明：子路由功能为前瞻性/试验性，用于验证多级路径的缓存与栈式导航
-->
<script setup lang="ts">
import { useTabRouter } from '@/lib'
const { forward } = useTabRouter()
</script>

<template>
  <div class="test2-layout">
    <div class="test2-layout__nav">
      <span class="test2-layout__label">[子路由]</span>
      <button class="test2-layout__link" @click="forward({ path: '/demo/subroute' })">
        概览
      </button>
      <button class="test2-layout__link" @click="forward({ path: '/demo/subroute/detail' })">
        详情
      </button>
      <button class="test2-layout__link" @click="forward({ path: '/demo/subroute/detail/d1' })">
        详情 d1
      </button>
    </div>
    <div class="test2-layout__content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.test2-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.test2-layout__nav {
  flex-shrink: 0;
  padding: 8px 12px;
  background: #f0f0f0;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.test2-layout__label {
  font-size: 12px;
  color: #888;
}
.test2-layout__link {
  padding: 4px 10px;
  font-size: 13px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}
.test2-layout__link:hover {
  background: #f5f5f5;
}
.test2-layout__content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}
</style>
