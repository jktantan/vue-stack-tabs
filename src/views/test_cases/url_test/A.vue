<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTabRouter } from '@/lib'

const props = defineProps<{
  // eslint-disable-next-line vue/prop-name-casing
  _back?: Record<string, unknown>
}>()

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
</script>

<template>
  <div class="test-page">
    <h2>多组件 URL 回退测试 - 组件 A</h2>
    <el-card>
      <div style="margin-bottom: 20px">
        <el-alert
          v-if="backParams"
          title="【组件 A】成功接收到回退参数 (Props)!"
          type="success"
          :closable="false"
        >
          <pre>{{ JSON.stringify(backParams, null, 2) }}</pre>
        </el-alert>
      </div>

      <p>当前节点：<el-tag type="warning">组件 A</el-tag></p>
      <p>你可以继续向前推进，以测验跨多个差异组件的回退机制。</p>

      <div style="margin-top: 20px">
        <el-button
          type="primary"
          @click="forward({ path: '/demo/url-test/b', query: { depth: 1 } })"
          >前进到【组件 B】</el-button
        >
        <el-divider direction="vertical" />
        <el-button type="warning" @click="backward('/demo/url-test/home')"
          >URL 退回首发点 Home</el-button
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
