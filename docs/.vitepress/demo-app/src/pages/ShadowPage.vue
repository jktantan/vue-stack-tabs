<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import ShadowProbe from '../components/ShadowProbe.vue'

const { t } = useI18n()

const rows = computed(() =>
  Array.from(
    { length: 50 },
    (_, index) => `${t('Demo.shadow.rowPrefix')}${index + 1}${t('Demo.shadow.rowSuffix')}`
  )
)
</script>

<template>
  <shadow-probe>
    <section class="page shadow-page">
      <header class="page-head">
        <p class="eyebrow">{{ t('Demo.shadow.eyebrow') }}</p>
        <h1>{{ t('Demo.shadow.title') }}</h1>
        <p v-html="t('Demo.shadow.lead')" />
      </header>

      <dl class="shadow-legend">
        <div>
          <dt><code>none</code></dt>
          <dd>{{ t('Demo.shadow.noneHint') }}</dd>
        </div>
        <div>
          <dt><code>top</code></dt>
          <dd>{{ t('Demo.shadow.topHint') }}</dd>
        </div>
        <div>
          <dt><code>bottom</code></dt>
          <dd>{{ t('Demo.shadow.bottomHint') }}</dd>
        </div>
        <div>
          <dt><code>both</code></dt>
          <dd>{{ t('Demo.shadow.bothHint') }}</dd>
        </div>
      </dl>

      <ul class="shadow-list">
        <li v-for="row in rows" :key="row">{{ row }}</li>
      </ul>
    </section>
  </shadow-probe>
</template>

<style scoped>
.shadow-page {
  min-height: 100%;
}

.shadow-list {
  display: grid;
  gap: 8px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.shadow-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px 16px;
  margin: 20px 0 0;
  padding: 14px 16px;
  background: var(--demo-surface);
  border: 1px solid var(--demo-border);
  border-radius: 8px;
}

.shadow-legend div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.shadow-legend dt {
  margin: 0;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  color: var(--demo-text);
}

.shadow-legend dd {
  margin: 0;
  font-size: 13px;
  color: var(--demo-muted);
}

.shadow-list li {
  padding: 14px 16px;
  background: var(--demo-surface);
  border: 1px solid var(--demo-border);
  border-radius: 8px;
}
</style>
