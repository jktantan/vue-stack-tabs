<script setup lang="ts">
import { ref } from 'vue'
import { useTabActions } from '@/lib'

const { openTab } = useTabActions()
const customUrl = ref('/demo/page1?dynamic=1')

const openNewTab = (refresh: boolean) => {
  const tabId = 'dynamic_test_' + (refresh ? 'with_refresh' : 'no_refresh')
  openTab(
    {
      id: tabId,
      title: refresh ? '重载标签' : '单纯唤醒',
      path: customUrl.value,
      closable: true
    },
    refresh
  )
}
</script>

<template>
  <div class="test-page">
    <h2>程序化开启配置页签</h2>
    <el-card>
      <p>
        此页面旨在测试通过 `useTabActions` hook 在已有的 Vue 组件内部打开新标签页，并验证 `refresh`
        参数控制的是否清空并重新加载逻辑。
      </p>

      <div style="margin: 20px 0">
        <span style="display: inline-block; width: 120px">配置目标地址:</span>
        <el-input v-model="customUrl" placeholder="输入要打开的目标路径" style="width: 400px" />
      </div>

      <div>
        <el-button type="primary" @click="openNewTab(false)"
          >常规打开/唤醒 (refresh: false)</el-button
        >
        <el-button type="danger" @click="openNewTab(true)">强制清空重载 (refresh: true)</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
