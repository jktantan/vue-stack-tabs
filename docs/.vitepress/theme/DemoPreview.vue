<script setup lang="ts">
/**
 * 演示预览：生产环境 iframe 加载打包进 docs 的 demo；开发环境加载 localhost
 * 生产：BASE_URL + 'demo/demo'（demo 应用部署在 docs 输出目录内）
 * 开发：http://localhost:5173/demo（需运行 pnpm dev）
 */
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    path?: string
    title?: string
  }>(),
  { path: '/demo', title: 'Live Demo' }
)

const isDev = import.meta.env.DEV
const base = (import.meta as any).env?.BASE_URL || '/'

const src = computed(() => {
  const p = props.path.startsWith('/') ? props.path : `/${props.path}`
  if (isDev) return `http://localhost:5173${p}`
  // 生产：demo 构建在 {base}demo/，应用 /demo 路由对应 {base}demo/demo
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  return `${b}/demo${p === '/demo' ? '/demo' : p}`
})

const error = ref(false)
</script>

<template>
  <div class="demo-preview">
    <div v-if="error && isDev" class="demo-preview-error">
      <p><strong>Demo unavailable / 演示不可用</strong></p>
      <p>请运行 <code>pnpm dev</code> 查看本地演示。部署到 GitHub Pages 后无需此步骤。</p>
    </div>
    <div v-else class="demo-preview-frame-wrap">
      <iframe
        :src="src"
        :title="title"
        class="demo-preview-iframe"
        @error="error = true"
      />
    </div>
  </div>
</template>
