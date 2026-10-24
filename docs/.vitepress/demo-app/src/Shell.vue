<!--
  演示应用外壳。

  结构：<VueStackTabs> 占满上方，下方是「演示控制台」。
  控制台按钮全部来自公开 API `useTabActions`，与标签内的页面操作（useTabRouter / useTabLoading）
  一起覆盖库的主要能力。

  文案统一走库的 i18n 实例（key 前缀 Demo.），语言由文档站经 iframe 的 ?lang= 传入，
  见 src/i18n.ts。
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import { useTabActions, type ITabData } from 'vue-stack-tabs'
import {
  applyDemoTheme,
  resolveInitialAccent,
  resolveInitialTheme,
  type DemoAccent,
  type DemoTheme
} from './theme'

const { t } = useI18n()
const { openTab, closeAllTabs, refreshTab, refreshAllTabs, tabs } = useTabActions()

const theme = ref<DemoTheme>(resolveInitialTheme())
const accent = ref<DemoAccent>(resolveInitialAccent())

const themeOptions = computed<{ value: DemoTheme; label: string }[]>(() => [
  { value: 'light', label: t('Demo.console.themeLight') },
  { value: 'dark', label: t('Demo.console.themeDark') }
])

const accentOptions = computed<{ value: DemoAccent; label: string; color: string }[]>(() => [
  { value: 'blue', label: t('Demo.console.accentBlue'), color: '#377dff' },
  { value: 'green', label: t('Demo.console.accentGreen'), color: '#10b981' },
  { value: 'violet', label: t('Demo.console.accentViolet'), color: '#8b5cf6' }
])

const setTheme = (value: DemoTheme) => {
  theme.value = value
  applyDemoTheme(theme.value, accent.value)
}

const setAccent = (value: DemoAccent) => {
  accent.value = value
  applyDemoTheme(theme.value, accent.value)
}

const base = import.meta.env.BASE_URL || '/'
/** 同源的 iframe 演示页（构建时随 demo 应用一起复制到 public） */
const iframeChildUrl = `${base}iframe-child.html`

const homeTab: ITabData = { id: 'home', title: t('Demo.tabs.home'), path: '/' }

const open = (tab: ITabData) => {
  void openTab(tab).catch((error: unknown) => {
    console.warn('[demo] openTab failed:', error)
  })
}

const openReportList = () => open({ id: 'report', title: t('Demo.tabs.report'), path: '/report' })
const openForm = () => open({ id: 'form', title: t('Demo.tabs.form'), path: '/form' })
const openScroll = () => open({ id: 'scroll', title: t('Demo.tabs.scroll'), path: '/scroll' })
const openNotice = () => open({ id: 'notice', title: t('Demo.tabs.notice'), path: '/notice' })
const openLoading = () => open({ id: 'loading', title: t('Demo.tabs.loading'), path: '/loading' })

/** 三个独立标签指向同一路由的不同参数，各自持有独立缓存 */
const openReports = () => {
  for (const id of [1, 2, 3]) {
    open({
      id: `report-${id}`,
      title: `${t('Demo.tabs.reportShort')} #${id}`,
      path: `/report/${id}`
    })
  }
}

const openIframeTab = () => {
  const index = tabs.value.filter((tab) => tab.iframe).length + 1
  open({
    id: `iframe-${index}`,
    title: `${t('Demo.tabs.iframe')} #${index}`,
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
      :home-tab="homeTab"
      :max="12"
      global-scroll
      session-prefix="docs-demo"
    />

    <section class="demo-console">
      <div class="demo-console__head">
        <h2>{{ t('Demo.console.title') }}</h2>
        <p v-html="t('Demo.console.desc')" />
      </div>

      <div class="demo-console__groups">
        <div class="demo-console__group">
          <span class="demo-console__label">{{ t('Demo.console.openGroup') }}</span>
          <button class="demo-btn" type="button" @click="openReportList">
            {{ t('Demo.tabs.report') }}
          </button>
          <button class="demo-btn" type="button" @click="openForm">
            {{ t('Demo.tabs.form') }}
          </button>
          <button class="demo-btn" type="button" @click="openScroll">
            {{ t('Demo.tabs.scroll') }}
          </button>
          <button class="demo-btn" type="button" @click="openNotice">
            {{ t('Demo.tabs.notice') }}
          </button>
          <button class="demo-btn" type="button" @click="openLoading">
            {{ t('Demo.console.openLoading') }}
          </button>
        </div>

        <div class="demo-console__group">
          <span class="demo-console__label">{{ t('Demo.console.cacheGroup') }}</span>
          <button class="demo-btn" type="button" @click="openReports">
            {{ t('Demo.console.openReports') }}
          </button>
          <button class="demo-btn" type="button" @click="openIframeTab">
            {{ t('Demo.console.openIframe') }}
          </button>
        </div>

        <div class="demo-console__group">
          <span class="demo-console__label">
            {{ t('Demo.console.current') }}: {{ activeTab?.title ?? t('Demo.console.none') }}
          </span>
          <button class="demo-btn" type="button" @click="refreshActive">
            {{ t('Demo.console.refreshCurrent') }}
          </button>
          <button class="demo-btn" type="button" @click="refreshAllTabs">
            {{ t('Demo.console.refreshAll') }}
          </button>
          <button class="demo-btn demo-btn--danger" type="button" @click="closeAllTabs">
            {{ t('Demo.console.closeAll') }}
          </button>
        </div>

        <div class="demo-console__group">
          <span class="demo-console__label">{{ t('Demo.console.themeGroup') }}</span>
          <button
            v-for="item in themeOptions"
            :key="item.value"
            class="demo-btn"
            :class="{ 'demo-btn--active': theme === item.value }"
            type="button"
            :aria-pressed="theme === item.value"
            @click="setTheme(item.value)"
          >
            {{ item.label }}
          </button>

          <span class="demo-console__label demo-console__label--accent">
            {{ t('Demo.console.accentGroup') }}
          </span>
          <button
            v-for="item in accentOptions"
            :key="item.value"
            class="demo-swatch"
            type="button"
            :style="{ backgroundColor: item.color }"
            :aria-label="item.label"
            :title="item.label"
            :aria-pressed="accent === item.value"
            @click="setAccent(item.value)"
          />
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

.demo-console__label--accent {
  margin-left: 8px;
}

@media (max-width: 720px) {
  .demo-console {
    padding: 12px;
  }
}
</style>
