<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTabRouter } from 'vue-stack-tabs'

const { backward } = useTabRouter()
const route = useRoute()

const id = computed(() => String(route.params.id ?? ''))

/** 后退并回传结果：目标页（报表列表）通过 props._back 接收 */
const goBackWithResult = () => {
  backward('/report', { picked: id.value })
}

const goBackOneStep = () => {
  backward(1)
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">报表详情 · Detail</p>
      <h1>{{ id }}</h1>
      <p class="lead">
        这是压在当前标签页面栈上的一层。后退会出栈并驱逐该页缓存，重新进入时是全新实例。
      </p>
    </header>

    <div class="grid">
      <article class="card">
        <h3>路由参数</h3>
        <p><code>route.params.id</code> = {{ id }}</p>
      </article>
      <article class="card">
        <h3>所属标签</h3>
        <p>本页与报表列表在同一个标签的栈里，不占用额外标签。</p>
      </article>
      <article class="card card--accent">
        <h3>回传结果</h3>
        <p>后退时可携带一次性参数，目标页用 <code>props._back</code> 接收。</p>
      </article>
    </div>

    <div class="actions">
      <button class="demo-btn demo-btn--primary" type="button" @click="goBackWithResult">
        后退并回传「{{ id }}」
      </button>
      <button class="demo-btn" type="button" @click="goBackOneStep">后退 1 步</button>
    </div>
  </section>
</template>
