<script setup lang="ts">
import { useI18n } from 'vue-i18n-lite'
import { useTabActions } from 'vue-stack-tabs'

const { t } = useI18n()
const { openTab } = useTabActions()

const open = (id: string, title: string, path: string) => {
  void openTab({ id, title, path }).catch(() => undefined)
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">{{ t('Demo.home.eyebrow') }}</p>
      <h1>{{ t('Demo.home.title') }}</h1>
      <p class="lead" v-html="t('Demo.home.lead')" />
    </header>

    <div class="grid">
      <article class="card">
        <h3>{{ t('Demo.home.card1Title') }}</h3>
        <p v-html="t('Demo.home.card1Body')" />
      </article>
      <article class="card">
        <h3>{{ t('Demo.home.card2Title') }}</h3>
        <p v-html="t('Demo.home.card2Body')" />
      </article>
      <article class="card card--accent">
        <h3>{{ t('Demo.home.card3Title') }}</h3>
        <p v-html="t('Demo.home.card3Body')" />
      </article>
    </div>

    <h2>{{ t('Demo.home.stepsTitle') }}</h2>
    <ol class="steps">
      <li v-html="t('Demo.home.step1')" />
      <li v-html="t('Demo.home.step2')" />
      <li v-html="t('Demo.home.step3')" />
      <li v-html="t('Demo.home.step4')" />
      <li v-html="t('Demo.home.step5')" />
    </ol>

    <div class="actions">
      <button
        class="demo-btn demo-btn--primary"
        type="button"
        @click="open('report', t('Demo.tabs.report'), '/report')"
      >
        {{ t('Demo.tabs.report') }}
      </button>
      <button class="demo-btn" type="button" @click="open('form', t('Demo.tabs.form'), '/form')">
        {{ t('Demo.tabs.form') }}
      </button>
      <button
        class="demo-btn"
        type="button"
        @click="open('scroll', t('Demo.tabs.scroll'), '/scroll')"
      >
        {{ t('Demo.tabs.scroll') }}
      </button>
      <button
        class="demo-btn"
        type="button"
        @click="open('notice', t('Demo.tabs.notice'), '/notice')"
      >
        {{ t('Demo.tabs.notice') }}
      </button>
    </div>
  </section>
</template>
