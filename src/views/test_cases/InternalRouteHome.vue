<script setup lang="ts">
import { ref, watch } from 'vue'
import useTabRouter from '@/lib/hooks/useTabRouter'

const props = defineProps<{
  /** 接收回退参数，挂载在专用属性 _back 上 */
  // eslint-disable-next-line vue/prop-name-casing
  _back?: Record<string, unknown>
}>()

const tabRouter = useTabRouter()
const homeInput = ref('')
const backParams = ref<Record<string, unknown> | null>(null)

// 侦听 _back prop 的变化
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

const goDetailNoParam = () => {
  tabRouter.forward({ path: '/demo/internal/detail' })
}

const goDetailWithParam = () => {
  tabRouter.forward({
    path: '/demo/internal/detail',
    query: {
      id: '999',
      name: 'test_user'
    }
  })
}
</script>

<template>
  <div class="test-page">
    <h2>内部路由测试 - 首页</h2>
    <el-card>
      <el-alert
        title="当前页面接收到的回退参数 (_back)"
        type="success"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <pre>{{ JSON.stringify(backParams, null, 2) }}</pre>
      </el-alert>
      <p>
        用于验证内部 &lt;router-view&gt; 的 `push` 与
        `back`，检查父级/同级切换前后，输入框缓存是否正常。
      </p>
      <div style="margin: 20px 0">
        <span style="display: inline-block; width: 120px">内部首页缓存:</span>
        <el-input
          v-model="homeInput"
          placeholder="输入内容后进入详情页再返回"
          style="width: 300px"
        />
      </div>
      <div>
        <el-button type="primary" @click="goDetailNoParam">进入详情 (无参)</el-button>
        <el-button type="success" @click="goDetailWithParam">进入详情 (带参id=999)</el-button>
        <el-button
          type="warning"
          @click="tabRouter.forward({ path: '/demo/internal/cross', query: { step: 1 } })"
          >跨组件测试栈推进</el-button
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
