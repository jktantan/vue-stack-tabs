<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import useTabRouter from '@/lib/hooks/useTabRouter'

interface BackParams {
  [key: string]: unknown
}

const props = defineProps<BackParams>()

const route = useRoute()
const tabRouter = useTabRouter()
const currentStep = ref(Number(route.query.step) || 1)
const backParams = ref<BackParams | null>(null)

watch(
  () => props,
  (newProps) => {
    const validProps = { ...newProps }
    delete validProps.tId
    delete validProps.pId
    if (Object.keys(validProps).length > 0) {
      backParams.value = validProps
    }
  },
  { immediate: true, deep: true }
)

const goDeeper = () => {
  tabRouter.forward({
    path: '/demo/internal/cross',
    query: { step: currentStep.value + 1 }
  })
}

const goDetail = () => {
  tabRouter.forward({ path: '/demo/internal/detail' })
}

const goBackToHome = () => {
  tabRouter.backward('/demo/internal', { fromCross: true, finalStep: currentStep.value })
}
</script>

<template>
  <div class="test-page">
    <h2>内部路由 - 跨组件测试</h2>
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

      <p>当前处于第 {{ currentStep }} 步路由组件中。</p>
      <div style="margin: 20px 0">
        <el-button type="primary" @click="goDeeper"
          >继续推入当前组件 (Step {{ currentStep + 1 }})</el-button
        >
        <el-button type="success" @click="goDetail">推入详情页 (Detail)</el-button>
      </div>
      <div>
        <el-button type="danger" @click="goBackToHome">URL 回退至 Home 且带参</el-button>
        <el-button type="info" @click="tabRouter.backward(1)">退回 1 步</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
