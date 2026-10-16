<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import { useTabRouter } from 'vue-stack-tabs'

const { t } = useI18n()
const { forward } = useTabRouter()

/** 后退时由详情页传来的结果，通过 props._back 接收 */
defineProps<{ _back?: { picked?: string } }>()

const rows = computed(() => [
  {
    id: 'R-1042',
    customer: t('Demo.report.customer1'),
    amount: '¥128,400',
    state: t('Demo.report.stateSettled')
  },
  {
    id: 'R-1043',
    customer: t('Demo.report.customer2'),
    amount: '¥56,900',
    state: t('Demo.report.statePending')
  },
  {
    id: 'R-1044',
    customer: t('Demo.report.customer3'),
    amount: '¥318,200',
    state: t('Demo.report.stateSettled')
  },
  {
    id: 'R-1045',
    customer: t('Demo.report.customer4'),
    amount: '¥74,150',
    state: t('Demo.report.statePending')
  },
  {
    id: 'R-1046',
    customer: t('Demo.report.customer5'),
    amount: '¥9,800',
    state: t('Demo.report.stateVoid')
  }
])

const openDetail = (id: string) => {
  // 标签内前进：压入当前标签的页面栈，可反复入栈同一路由的不同参数
  forward({ path: `/report/${id}` })
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">{{ t('Demo.report.eyebrow') }}</p>
      <h1>{{ t('Demo.report.title') }}</h1>
      <p class="lead" v-html="t('Demo.report.lead')" />
    </header>

    <p v-if="_back?.picked" class="notice">
      <b>{{ t('Demo.report.backPrefix') }}</b
      >{{ t('Demo.report.backBody') }} <code>{{ _back.picked }}</code
      >。
    </p>

    <table class="table">
      <thead>
        <tr>
          <th>{{ t('Demo.report.colId') }}</th>
          <th>{{ t('Demo.report.colCustomer') }}</th>
          <th>{{ t('Demo.report.colAmount') }}</th>
          <th>{{ t('Demo.report.colState') }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.customer }}</td>
          <td>{{ row.amount }}</td>
          <td>
            <span class="tag">{{ row.state }}</span>
          </td>
          <td>
            <button class="demo-btn" type="button" @click="openDetail(row.id)">
              {{ t('Demo.report.viewDetail') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="actions">
      <button class="demo-btn" type="button" @click="openDetail('R-1042')">
        {{ t('Demo.report.forwardPrefix') }} R-1042
      </button>
      <button class="demo-btn" type="button" @click="openDetail('R-1044')">
        {{ t('Demo.report.forwardPrefix') }} R-1044
      </button>
    </div>
  </section>
</template>
