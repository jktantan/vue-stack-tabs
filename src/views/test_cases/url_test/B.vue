<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTabRouter } from '@/lib'

const props = defineProps<{
  // eslint-disable-next-line vue/prop-name-casing
  _back?: Record<string, unknown>
}>()

const route = useRoute()
const { forward, backward } = useTabRouter()

const backParams = ref<Record<string, unknown> | null>(null)
watch(
  () => props._back,
  (newBackParams) => {
    if (newBackParams && Object.keys(newBackParams).length > 0) {
      backParams.value = newBackParams
    } else {
      backParams.value = null
    }
  },
  { immediate: true, deep: true }
)

const goBackToHome = () => {
  backward('/demo/url-test/home', {
    msg: 'Hello from B, sent directly back to Home bypassing A!',
    time: new Date().toLocaleTimeString()
  })
}

const goBackToA = () => {
  backward('/demo/url-test/a', {
    msg: 'Back parameter from B!',
    status: 'success'
  })
}
</script>

<template>
  <div class="test-page">
    <h2>多组件 URL 回退测试 - 组件 B (终点)</h2>
    <el-card>
      <div style="margin-bottom: 20px">
        <el-alert
          v-if="backParams"
          title="【组件 B】成功接收到回退参数 (Props)!"
          type="success"
          :closable="false"
        >
          <pre>{{ JSON.stringify(backParams, null, 2) }}</pre>
        </el-alert>
      </div>

      <p>当前节点：<el-tag type="danger">组件 B</el-tag></p>

      <div style="margin-top: 20px">
        <el-button
          type="primary"
          @click="
            forward({
              path: '/demo/url-test/b',
              query: { depth: (Number(route.query.depth) || 1) + 1 }
            })
          "
          >循环压栈【组件 B】</el-button
        >
      </div>

      <div style="margin-top: 20px">
        <!-- 这两个就是测试的终极奥义，分别定向到历史中的 A 或是 Home -->
        <el-button type="success" @click="goBackToA">精准 URL 退回 【组件 A】 并传参</el-button>
        <el-button type="warning" @click="goBackToHome"
          >绕过 A 越级 URL 退回 【首发点 Home】 传参</el-button
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
