<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import { useRoute } from 'vue-router'
import { useTabRouter } from 'vue-stack-tabs'

const { t } = useI18n()
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
      <p class="eyebrow">{{ t('Demo.detail.eyebrow') }}</p>
      <h1>{{ id }}</h1>
      <p class="lead">{{ t('Demo.detail.lead') }}</p>
    </header>

    <div class="grid">
      <article class="card">
        <h3>{{ t('Demo.detail.cardRouteTitle') }}</h3>
        <p><code>route.params.id</code> = {{ id }}</p>
      </article>
      <article class="card">
        <h3>{{ t('Demo.detail.cardTabTitle') }}</h3>
        <p>{{ t('Demo.detail.cardTabBody') }}</p>
      </article>
      <article class="card card--accent">
        <h3>{{ t('Demo.detail.cardResultTitle') }}</h3>
        <p v-html="t('Demo.detail.cardResultBody')" />
      </article>
    </div>

    <div class="actions">
      <button class="demo-btn demo-btn--primary" type="button" @click="goBackWithResult">
        {{ t('Demo.detail.backWithResult') }}「{{ id }}」
      </button>
      <button class="demo-btn" type="button" @click="goBackOneStep">
        {{ t('Demo.detail.backOneStep') }}
      </button>
    </div>
  </section>
</template>
