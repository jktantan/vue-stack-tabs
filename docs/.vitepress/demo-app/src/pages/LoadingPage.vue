<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import { useTabLoading } from 'vue-stack-tabs'

const { t } = useI18n()
/**
 * 页签级加载遮罩：库通过页面组件上的 tId 找到所属标签，
 * 因此必须在标签内的页面组件里调用（本页由 vue-stack-tabs 渲染）。
 */
const { openTabLoading, closeTabLoading } = useTabLoading()

const busy = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

/** 模拟一次 2 秒的异步请求：开始显示遮罩，结束时关闭 */
const simulateRequest = () => {
  if (busy.value) return
  busy.value = true
  openTabLoading()
  timer = setTimeout(() => {
    closeTabLoading()
    busy.value = false
    timer = undefined
  }, 2000)
}

onUnmounted(() => {
  // useTabLoading 自身会在卸载时关闭遮罩，这里只需清掉未完成的定时器
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
})
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">{{ t('Demo.loading.eyebrow') }}</p>
      <h1>{{ t('Demo.loading.title') }}</h1>
      <p class="lead" v-html="t('Demo.loading.lead')" />
    </header>

    <div class="actions">
      <button
        class="demo-btn demo-btn--primary"
        type="button"
        :disabled="busy"
        @click="simulateRequest"
      >
        {{ busy ? t('Demo.loading.busy') : t('Demo.loading.button') }}
      </button>
    </div>

    <div class="notice">
      <p>
        <b>{{ t('Demo.loading.tipPrefix') }}</b
        >{{ t('Demo.loading.tipBody') }}
      </p>
    </div>

    <h2>{{ t('Demo.loading.codeTitle') }}</h2>
    <pre class="code-block"><code>import { useTabLoading } from 'vue-stack-tabs'

const { openTabLoading, closeTabLoading } = useTabLoading()

const load = async () =&gt; {
  openTabLoading()
  try {
    await fetchSomething()
  } finally {
    closeTabLoading()
  }
}</code></pre>
  </section>
</template>

<style scoped>
.code-block {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid var(--demo-border);
  border-radius: var(--demo-radius);
  background: var(--demo-surface);
  color: var(--demo-text);
  font-size: 12.5px;
  line-height: 1.7;
  overflow-x: auto;
}

.code-block code {
  padding: 0;
  background: transparent;
  color: inherit;
}

.actions .demo-btn:disabled {
  cursor: progress;
  opacity: 0.7;
}
</style>
