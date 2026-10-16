<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import { useTabRouter } from 'vue-stack-tabs'

const { t } = useI18n()
const { addScrollTarget } = useTabRouter()

/** 注册页面内的滚动容器，切换标签时由库保存 / 恢复其滚动位置 */
onMounted(() => {
  addScrollTarget('.scroll-area')
})

const rows = computed(() =>
  Array.from({ length: 60 }, (_, index) => ({
    no: index + 1,
    text: `${t('Demo.scroll.rowPrefix')}${index + 1}${t('Demo.scroll.rowMid')}${String(index + 1).padStart(3, '0')}`
  }))
)
</script>

<template>
  <section class="scroll-page">
    <header class="page-head">
      <p class="eyebrow">{{ t('Demo.scroll.eyebrow') }}</p>
      <h1>{{ t('Demo.scroll.title') }}</h1>
      <p class="lead">
        {{ t('Demo.scroll.leadPrefix') }} <code>addScrollTarget('.scroll-area')</code
        >{{ t('Demo.scroll.leadTail') }}
      </p>
    </header>

    <ul class="row-list scroll-area">
      <li v-for="row in rows" :key="row.no">
        <span class="idx">#{{ row.no }}</span>
        <span>{{ row.text }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.scroll-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 30px 34px 24px;
}

.scroll-page .page-head {
  flex: 0 0 auto;
}

.scroll-area {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
</style>
