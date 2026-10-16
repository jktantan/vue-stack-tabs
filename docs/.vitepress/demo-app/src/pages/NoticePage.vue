<script setup lang="ts">
import { useI18n } from 'vue-i18n-lite'

const { t } = useI18n()
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">{{ t('Demo.notice.eyebrow') }}</p>
      <h1>{{ t('Demo.notice.title') }}</h1>
      <p class="lead">{{ t('Demo.notice.lead') }}</p>
    </header>

    <div class="notice">
      <p>
        <b>{{ t('Demo.notice.tipPrefix') }}</b
        >{{ t('Demo.notice.tipBody') }}
      </p>
    </div>

    <h2>{{ t('Demo.notice.changesTitle') }}</h2>
    <ul class="steps">
      <li v-html="t('Demo.notice.change1')" />
      <li v-html="t('Demo.notice.change2')" />
      <li v-html="t('Demo.notice.change3')" />
      <li v-html="t('Demo.notice.change4')" />
    </ul>

    <h2>{{ t('Demo.notice.nextTitle') }}</h2>
    <p class="muted">{{ t('Demo.notice.nextBody') }}</p>
  </section>
</template>
