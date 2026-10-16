<!--
  演示应用外壳。

  结构：<VueStackTabs> 占满上方，下方是「演示控制台」。
  控制台按钮全部来自公开 API `useTabActions`，与标签内的页面操作（useTabRouter / useTabLoading）
  一起覆盖库的主要能力。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useTabActions, type ITabData } from 'vue-stack-tabs'

const { openTab, closeAllTabs, refreshTab, refreshAllTabs, tabs } = useTabActions()

const base = import.meta.env.BASE_URL || '/'
/** 同源的 iframe 演示页（构建时随 demo 应用一起复制到 public） */
const iframeChildUrl = `${base}iframe-child.html`

const defaultTabs: ITabData[] = [{ id: 'home', title: '首页', path: '/', closable: false }]

const open = (tab: ITabData) => {
  void openTab(tab).catch((error: unknown) => {
    console.warn('[demo] openTab failed:', error)
  })
}

const openReportList = () => open({ id: 'report', title: '报表列表', path: '/report' })
const openForm = () => open({ id: 'form', title: '表单', path: '/form' })
const openScroll = () => open({ id: 'scroll', title: '长列表', path: '/scroll' })
const openNotice = () => open({ id: 'notice', title: '公告', path: '/notice' })

/** 三个独立标签指向同一路由的不同参数，各自持有独立缓存 */
const openReports = () => {
  for (const id of [1, 2, 3]) {
    open({ id: `report-${id}`, title: `报表 #${id}`, path: `/report/${id}` })
  }
}

const openIframeTab = () => {
  const index = tabs.value.filter((tab) => tab.iframe).length + 1
  open({
    id: `iframe-${index}`,
    title: `iframe #${index}`,
    path: iframeChildUrl,
    iframe: true
  })
}

const activeTab = computed(() => tabs.value.find((tab) => tab.active))

const refreshActive = () => {
  const current = activeTab.value
  if (current) refreshTab(current.id)
}
</script>

<template>
  <div class="demo-app">
    <vue-stack-tabs
      iframe-path="/iframe"
      :default-tabs="defaultTabs"
      :max="12"
      global-scroll
      session-prefix="docs-demo"
    />

    <section class="demo-console">
      <div class="demo-console__head">
        <h2>演示控制台</h2>
        <p>标签栏支持拖拽排序与右键菜单；所有按钮都调用公开 API <code>useTabActions</code>。</p>
      </div>

      <div class="demo-console__groups">
        <div class="demo-console__group">
          <span class="demo-console__label">打开标签</span>
          <button class="demo-btn" type="button" @click="openReportList">报表列表</button>
          <button class="demo-btn" type="button" @click="openForm">表单</button>
          <button class="demo-btn" type="button" @click="openScroll">长列表</button>
          <button class="demo-btn" type="button" @click="openNotice">公告</button>
        </div>

        <div class="demo-console__group">
          <span class="demo-console__label">缓存隔离</span>
          <button class="demo-btn" type="button" @click="openReports">打开 3 个报表标签</button>
          <button class="demo-btn" type="button" @click="openIframeTab">打开 iframe 标签</button>
        </div>

        <div class="demo-console__group">
          <span class="demo-console__label">当前：{{ activeTab?.title ?? '无' }}</span>
          <button class="demo-btn" type="button" @click="refreshActive">刷新当前</button>
          <button class="demo-btn" type="button" @click="refreshAllTabs">刷新全部</button>
          <button class="demo-btn demo-btn--danger" type="button" @click="closeAllTabs">
            关闭全部
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.demo-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
}

/* 库根节点 class 为 .stack-tab，用 :deep 让它占满剩余高度 */
.demo-app :deep(.stack-tab) {
  flex: 1 1 auto;
  min-height: 0;
}

.demo-console {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: flex-start;
  padding: 14px 18px;
  border-top: 1px solid var(--demo-border);
  background: var(--demo-surface);
}

.demo-console__head {
  flex: 1 1 220px;
  min-width: 200px;
}

.demo-console__head h2 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--demo-text);
}

.demo-console__head p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--demo-muted);
}

.demo-console__head code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--demo-surface-2);
  font-size: 11px;
}

.demo-console__groups {
  display: flex;
  flex: 2 1 480px;
  flex-wrap: wrap;
  gap: 10px 20px;
}

.demo-console__group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.demo-console__label {
  margin-right: 2px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--demo-muted);
}

@media (max-width: 720px) {
  .demo-console {
    padding: 12px;
  }
}
</style>
