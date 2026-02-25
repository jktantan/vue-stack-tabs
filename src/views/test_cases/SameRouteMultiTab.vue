<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 记录该组件实例化瞬间的独立路由参数，避免在转场时被全局路由的抢占更新给篡改视效
const currentId = ref(route.query.id)
const routeInput = ref('')
const sharedCount = ref(0)
</script>

<template>
  <div class="test-page">
    <h2>同路由异参数隔离测试 - 目标组件页</h2>
    <el-card>
      <p>
        当前页面组件被多路路由复用。我们要验证：给定的两个带不同 Query 参的 Tab（如 id=1 和
        id=2）在这个组件上的渲染是否会互相串联。
      </p>

      <div style="margin: 20px 0">
        <span style="display: inline-block; width: 120px">当前收到的 ID 参:</span>
        <el-tag type="danger" size="large">{{ currentId || '暂无' }}</el-tag>
      </div>

      <div style="margin: 20px 0">
        <span style="display: inline-block; width: 120px">隔离输入测试:</span>
        <el-input v-model="routeInput" placeholder="在此输入内容" style="width: 300px" />
      </div>

      <div>
        <el-button type="primary" @click="sharedCount++"
          >状态变更 (当前: {{ sharedCount }})</el-button
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
