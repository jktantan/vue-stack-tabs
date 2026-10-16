<template>
  <div class="full-demo">
    <div class="demo-container">
      <vue-stack-tabs :default-tabs="defaultTabs" iframe-path="/iframe" i18n="zh-CN" />
    </div>

    <div class="demo-controls">
      <h3>快速操作 / Quick Actions</h3>
      <div class="control-group">
        <button class="btn" @click="openHome">🏠 首页 Home</button>
        <button class="btn" @click="openAbout">📄 关于 About</button>
        <button class="btn" @click="openContact">📧 联系 Contact</button>
      </div>
      <div class="control-group">
        <button class="btn" @click="openMultipleTabs">📑 打开多个标签</button>
        <button class="btn" @click="refreshCurrentTab">🔄 刷新当前</button>
        <button class="btn" @click="closeAllTabs">❌ 关闭全部</button>
      </div>
      <div class="control-group">
        <button class="btn" @click="openScrollDemo">📜 滚动演示</button>
        <button class="btn" @click="openFormDemo">📝 表单演示</button>
        <button class="btn" @click="openNestedRoutes">🔗 嵌套路由</button>
      </div>
      <div class="control-group">
        <button class="btn" @click="openDynamicTab">🎲 动态标签</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import useTabActions from '../../../../src/lib/hooks/useTabActions'
import type { ITabData } from '../../../../src/lib/interface/data'

const { openTab, refreshTab, closeAllTabs, tabs } = useTabActions()

const defaultTabs: ITabData[] = [
  {
    id: 'home',
    title: '🏠 首页 Home',
    path: '/demo-home',
    closable: false
  }
]

const openHome = () => {
  openTab({
    id: 'home',
    title: '🏠 首页 Home',
    path: '/demo-home',
    closable: false
  })
}

const openAbout = () => {
  openTab({
    id: 'about',
    title: '📄 关于 About',
    path: '/demo-about'
  })
}

const openContact = () => {
  openTab({
    id: 'contact',
    title: '📧 联系 Contact',
    path: '/demo-contact'
  })
}

const openMultipleTabs = () => {
  const pages = [
    { id: 'page-1', title: '📄 页面 Page 1', path: '/demo-page/1' },
    { id: 'page-2', title: '📄 页面 Page 2', path: '/demo-page/2' },
    { id: 'page-3', title: '📄 页面 Page 3', path: '/demo-page/3' }
  ]
  pages.forEach((page) => openTab(page))
}

const refreshCurrentTab = () => {
  const activeTab = tabs.value.find((tab) =>
    document.querySelector(`[data-tab-id="${tab.id}"].active`)
  )
  if (activeTab) {
    refreshTab(activeTab.id)
  }
}

const openScrollDemo = () => {
  openTab({
    id: 'scroll-demo',
    title: '📜 滚动演示 Scroll',
    path: '/demo-scroll'
  })
}

const openFormDemo = () => {
  openTab({
    id: 'form-demo',
    title: '📝 表单演示 Form',
    path: '/demo-form'
  })
}

const openNestedRoutes = () => {
  openTab({
    id: 'nested',
    title: '🔗 嵌套路由 Nested',
    path: '/demo-nested'
  })
}

const openDynamicTab = () => {
  const id = Date.now().toString()
  const num = Math.floor(Math.random() * 100)
  openTab({
    id: `dynamic-${id}`,
    title: `🎲 随机 ${num}`,
    path: `/demo-dynamic/${num}`
  })
}
</script>

<style scoped>
.full-demo {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
}

.demo-container {
  height: 500px;
  background: #f5f5f5;
}

.demo-controls {
  background: white;
  padding: 20px;
  border-top: 1px solid var(--vp-c-divider);
}

.demo-controls h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.control-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
</style>
