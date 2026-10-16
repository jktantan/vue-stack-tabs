<script setup lang="ts">
import { useI18n } from 'vue-i18n-lite'

const { t } = useI18n()
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">404</p>
      <h1>{{ t('Demo.notFound.title') }}</h1>
      <p class="lead">{{ t('Demo.notFound.lead') }}</p>
    </header>
  </section>
</template>
