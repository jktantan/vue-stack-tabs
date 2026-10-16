<script setup lang="ts">
import { onMounted } from 'vue'
import { useTabRouter } from 'vue-stack-tabs'

const { addScrollTarget } = useTabRouter()

/** 注册页面内的滚动容器，切换标签时由库保存 / 恢复其滚动位置 */
onMounted(() => {
  addScrollTarget('.scroll-area')
})

const rows = Array.from({ length: 60 }, (_, index) => ({
  no: index + 1,
  text: `第 ${index + 1} 行 · 记录 ${String(index + 1).padStart(3, '0')}`
}))
</script>

<template>
  <section class="scroll-page">
    <header class="page-head">
      <p class="eyebrow">长列表 · Scroll</p>
      <h1>滚动位置记忆</h1>
      <p class="lead">
        往下滚到中段，切到别的标签再切回来——会回到原来的位置。滚动容器通过
        <code>addScrollTarget('.scroll-area')</code> 注册给库。
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
