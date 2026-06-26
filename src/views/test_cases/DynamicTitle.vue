<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import useTabPanel from '@/lib/hooks/useTabPanel'

const { tabs } = useTabPanel()
const instance = getCurrentInstance()
const newTitle = ref('动态变更的标题')

const getCurrentPageId = () => {
  return (instance?.attrs.pId ?? instance?.props.pId) as string | undefined
}

const changeTitle = () => {
  const cacheName = getCurrentPageId()
  const currentTab = tabs.value.find((tab) =>
    tab.pages.list().some((page) => page.id === cacheName)
  )

  if (currentTab) {
    currentTab.title = newTitle.value
  } else {
    alert('无法找到所属页签')
  }
}
</script>

<template>
  <div class="test-page">
    <h2>动态修改页签名称与 API 测试</h2>
    <el-card>
      <p>此页面旨在测试运行时动态修改其所属标签的名字的功能。</p>

      <div style="margin: 20px 0">
        <el-input
          v-model="newTitle"
          placeholder="输入新的标签名"
          style="width: 200px; margin-right: 15px"
        />
        <el-button type="success" @click="changeTitle">应用新标题</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.test-page {
  padding: 20px;
}
</style>
