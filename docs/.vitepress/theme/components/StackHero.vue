<!--
  首页 hero 的签名元素：一个会自己"换标签"的标签栏 + 页面栈示意。

  它不是在截图，而是用 CSS 画的：三层页面卡片叠在一起表示 keep-alive 缓存与导航栈，
  点击标签或等待自动轮播即可看到切换。放进 hero 的 home-hero-image 插槽（见 theme/index.ts）。
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface HeroTab {
  title: string
  /** 页面内示意文本行的宽度百分比 */
  lines: number[]
}

const tabs: HeroTab[] = [
  { title: '首页', lines: [92, 64, 78] },
  { title: '报表', lines: [70, 88, 52] },
  { title: '表单', lines: [96, 44, 68] }
]

const active = ref(0)
const current = computed(() => tabs[active.value])

let timer: ReturnType<typeof setInterval> | undefined

const stop = () => {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

const select = (index: number) => {
  active.value = index
  stop()
}

onMounted(() => {
  // 尊重系统的"减少动态效果"设置
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    active.value = (active.value + 1) % tabs.length
  }, 2600)
})

onBeforeUnmount(stop)
</script>

<template>
  <div class="stack-hero">
    <div class="stack-hero__tabs">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.title"
        type="button"
        class="stack-hero__tab"
        :class="{ 'is-active': index === active }"
        :aria-pressed="index === active"
        @click="select(index)"
      >
        {{ tab.title }}
      </button>
    </div>

    <div class="stack-hero__stage">
      <div class="stack-hero__layer stack-hero__layer--far" />
      <div class="stack-hero__layer stack-hero__layer--mid" />
      <div :key="active" class="stack-hero__page">
        <span class="stack-hero__page-title">{{ current.title }}</span>
        <span
          v-for="(width, index) in current.lines"
          :key="index"
          class="stack-hero__line"
          :style="{ width: `${width}%` }"
        />
        <span class="stack-hero__badge">keep-alive</span>
      </div>
    </div>

    <p class="stack-hero__caption">每个标签 = 独立页面实例 + 缓存 + 导航栈</p>
  </div>
</template>

<style scoped>
.stack-hero {
  --hero-accent: #00d797;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.stack-hero__tabs {
  display: flex;
  gap: 4px;
  padding: 5px 5px 0;
  border: 1px solid var(--vp-c-divider);
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  background: var(--vp-c-bg-soft);
}

.stack-hero__tab {
  position: relative;
  flex: 1 1 0;
  padding: 7px 10px;
  border: none;
  border-radius: 7px 7px 0 0;
  background: transparent;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
  font-size: 12.5px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.stack-hero__tab::after {
  content: '';
  position: absolute;
  right: 10px;
  bottom: 0;
  left: 10px;
  height: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background 0.2s ease;
}

.stack-hero__tab.is-active {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.stack-hero__tab.is-active::after {
  background: var(--vp-c-brand-1);
}

.stack-hero__stage {
  position: relative;
  height: 188px;
  padding: 14px 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0 0 12px 12px;
  background: var(--vp-c-bg);
}

.stack-hero__layer {
  position: absolute;
  left: 50%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg-soft);
  transform: translateX(-50%);
}

.stack-hero__layer--far {
  top: 6px;
  width: 82%;
  height: 30px;
  opacity: 0.55;
}

.stack-hero__layer--mid {
  top: 20px;
  width: 91%;
  height: 30px;
  opacity: 0.8;
}

.stack-hero__page {
  position: absolute;
  top: 34px;
  right: 16px;
  bottom: 14px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 16px 18px;
  border: 1px solid var(--vp-c-divider);
  border-top: 2px solid var(--vp-c-brand-1);
  border-radius: 9px;
  background: var(--vp-c-bg);
  box-shadow: 0 12px 28px -18px rgba(15, 23, 42, 0.45);
  animation: stack-hero-enter 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.stack-hero__page-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.stack-hero__line {
  display: block;
  height: 7px;
  border-radius: 4px;
  background: var(--vp-c-default-soft);
}

.stack-hero__line:first-of-type {
  background: color-mix(in srgb, var(--vp-c-brand-1) 26%, transparent);
}

.stack-hero__badge {
  align-self: flex-start;
  margin-top: auto;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--hero-accent) 16%, transparent);
  color: #0a8f6a;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  letter-spacing: 0.02em;
}

.dark .stack-hero__badge {
  color: var(--hero-accent);
}

.stack-hero__caption {
  margin: 12px 0 0;
  text-align: center;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
}

@keyframes stack-hero-enter {
  from {
    opacity: 0;
    transform: translateY(7px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stack-hero__page {
    animation: none;
  }
}
</style>
