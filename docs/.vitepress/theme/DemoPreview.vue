<!--
  演示预览：用一个 iframe 包住独立的 demo 应用。

  为什么是 iframe：vue-stack-tabs 管理与 URL 绑定的路由 / 标签栈，若直接跑在文档站内
  会与 VitePress 的路由冲突（历史上需要用 createMemoryHistory 打补丁）。放进 iframe 后
  文档站与演示应用各自拥有独立的路由与作用域，观感与真实业务应用一致。

  生产：{base}demo-app/（docs:build 时由 vite.config.docs-demo.ts 构建到 dist/demo-app）
  开发：本机 demo dev server（pnpm run docs:dev 会并行启动，端口与 vite.config.docs-demo.ts 一致）
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useData } from 'vitepress'

const props = withDefaults(
  defineProps<{
    /** 演示应用内的路由路径（hash 路由），留空则落到演示首页 */
    path?: string
    title?: string
    /** iframe 高度 */
    height?: string
  }>(),
  { path: '', title: 'vue-stack-tabs 在线演示', height: '620px' }
)

/**
 * 需与 vite.config.docs-demo.ts 的 DEMO_BASE / server.port 保持一致。
 * 用 `demo-app/` 而不是 `demo/`：后者会与文档页 demo.html 的同名路径撞车。
 */
const DEMO_BASE = '/vue-stack-tabs/demo-app/'
const DEV_DEMO_ORIGIN = 'http://localhost:5174'

const isDev = import.meta.env.DEV
const siteBase = import.meta.env.BASE_URL || '/'
/**
 * 文档站当前语言（VitePress 的 locale.lang：'zh-CN' | 'en'）。
 * 通过 iframe 的 `?lang=` 传给演示应用，demo 侧在 src/i18n.ts 读取；
 * 文档站切换语言会整页跳转、iframe 随之重建，因此无需额外通信。
 */
const { lang } = useData()
/** 文档站语言：预览外壳的按钮与兜底文案跟随 VitePress locale */
const isZh = computed(() => (lang.value || '').toLowerCase().startsWith('zh'))
const openLabel = computed(() => (isZh.value ? '在新窗口打开 ↗' : 'Open in a new window ↗'))

const demoBase = computed(() => {
  if (isDev) return DEV_DEMO_ORIGIN + DEMO_BASE
  const base = siteBase.endsWith('/') ? siteBase : `${siteBase}/`
  return `${base}demo-app/`
})

const src = computed(() => {
  const query = `?lang=${encodeURIComponent(lang.value || 'zh-CN')}`
  if (!props.path) return `${demoBase.value}${query}`
  const path = props.path.startsWith('/') ? props.path : `/${props.path}`
  return `${demoBase.value}${query}#${path}`
})

const loaded = ref(false)
const failed = ref(false)

let timer: ReturnType<typeof setTimeout> | undefined

const clearTimer = () => {
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
}

// 注意：只能在客户端挂载后设置，SSR 阶段没有 window
onMounted(() => {
  timer = setTimeout(() => {
    if (!loaded.value) failed.value = true
  }, 8000)
})

onBeforeUnmount(clearTimer)

const onLoad = () => {
  loaded.value = true
  failed.value = false
  clearTimer()
}
</script>

<template>
  <div class="demo-preview">
    <div class="demo-preview__bar">
      <span class="demo-preview__dots" aria-hidden="true"> <i /><i /><i /> </span>
      <span class="demo-preview__title">{{ title }}</span>
      <a class="demo-preview__open" :href="src" target="_blank" rel="noreferrer">
        {{ openLabel }}
      </a>
    </div>

    <div class="demo-preview__stage" :style="{ height }">
      <iframe
        v-if="!failed"
        class="demo-preview__frame"
        :src="src"
        :title="title"
        loading="lazy"
        @load="onLoad"
      />
      <div v-else class="demo-preview__fallback">
        <p>
          <b>{{ isZh ? '演示应用未就绪' : 'The demo app is not ready' }}</b>
        </p>
        <p v-if="isZh">
          本地开发请使用 <code>pnpm run docs:dev</code>（它会同时启动文档与演示应用的 dev
          server）；部署后无需额外操作。
        </p>
        <p v-else>
          For local development run <code>pnpm run docs:dev</code> (it starts both the docs and the
          demo dev server); no extra step is needed after deployment.
        </p>
        <p>
          <a :href="src" target="_blank" rel="noreferrer">
            {{ isZh ? '仍要尝试直接打开 ↗' : 'Try opening it anyway ↗' }}
          </a>
        </p>
      </div>
    </div>
  </div>
</template>
