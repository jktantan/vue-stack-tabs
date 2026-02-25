<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTabRouter } from '@/lib'

const props = defineProps<{
  // eslint-disable-next-line vue/prop-name-casing
  _back?: Record<string, unknown>
}>()

const route = useRoute()
const { backward, forward } = useTabRouter()

const detailInput = ref('')
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

const goBack1 = () => backward(1)
const goBack3 = () => backward(3)
const goBackTooMany = () => backward(100)
const goBackByName = () => backward('/demo/internal')
const goBackWithQuery = () =>
  backward('/demo/internal', { fromDetailMessage: 'Hello from detail!' })
const goBackWrongUrl = () => backward('/demo/not/exist')

const forwardAgain = () => {
  const nextId = Number(route.query.id || 0) + 1
  forward({
    path: '/demo/internal/detail',
    query: { id: nextId, msg: 'forward 同组件' }
  })
}

// 补充跨组件转发
const forwardCross = () => {
  forward({
    path: '/demo/internal/cross',
    query: { step: 1 }
  })
}
</script>

<template>
  <div class="test-page">
    <h2>内部路由测试 - 详情页</h2>
    <el-card>
      <el-alert
        v-if="backParams"
        title="当前页面接收到的回退参数 (Props)"
        type="success"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <pre>{{ JSON.stringify(backParams, null, 2) }}</pre>
      </el-alert>
      <el-alert
        title="当前页面的常规查询参数"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <pre>{{ JSON.stringify(route.query, null, 2) }}</pre>
      </el-alert>

      <div style="margin: 20px 0">
        <span style="display: inline-block; width: 120px">详情页缓存:</span>
        <el-input v-model="detailInput" placeholder="在这里输入内容" style="width: 300px" />
      </div>

      <div class="btn-group">
        <el-button type="primary" @click="forwardAgain"
          >Forward 到同一个组件 (id={{ Number(route.query.id || 0) + 1 }})</el-button
        >
        <el-button type="warning" @click="forwardCross">Forward 跨组件 (Cross Step 1)</el-button>
        <el-divider border-style="dashed" />
        <el-button type="warning" @click="goBack1">Backward 1 步</el-button>
        <el-button type="warning" @click="goBack3">Backward 3 步</el-button>
        <el-button type="danger" plain @click="goBackTooMany"
          >Backward 超出栈数量 (100步)</el-button
        >
        <el-divider border-style="dashed" />
        <el-button type="success" @click="goBackByName">URL Backward (回退到首页)</el-button>
        <el-button type="success" plain @click="goBackWithQuery"
          >URL Backward 带参数到首页</el-button
        >
        <el-button type="danger" @click="goBackWrongUrl"
          >Backward 不存在的 URL (看控制台)</el-button
        >
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
.btn-group .el-button {
  margin-top: 10px;
  margin-right: 10px;
}
</style>
