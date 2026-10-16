<script setup lang="ts">
import { reactive } from 'vue'
import { useI18n } from 'vue-i18n-lite'

const { t } = useI18n()

const form = reactive({
  name: '',
  role: 'viewer',
  scope: t('Demo.form.scopeDept'),
  remark: ''
})
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">{{ t('Demo.form.eyebrow') }}</p>
      <h1>{{ t('Demo.form.title') }}</h1>
      <p class="lead">{{ t('Demo.form.lead') }}</p>
    </header>

    <form class="card" @submit.prevent>
      <div class="field">
        <label for="name">{{ t('Demo.form.name') }}</label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          :placeholder="t('Demo.form.namePlaceholder')"
        />
      </div>

      <div class="field">
        <label for="role">{{ t('Demo.form.role') }}</label>
        <select id="role" v-model="form.role">
          <option value="viewer">{{ t('Demo.form.roleViewer') }}</option>
          <option value="editor">{{ t('Demo.form.roleEditor') }}</option>
          <option value="admin">{{ t('Demo.form.roleAdmin') }}</option>
        </select>
      </div>

      <div class="field">
        <label for="scope">{{ t('Demo.form.scope') }}</label>
        <select id="scope" v-model="form.scope">
          <option>{{ t('Demo.form.scopeDept') }}</option>
          <option>{{ t('Demo.form.scopeCompany') }}</option>
          <option>{{ t('Demo.form.scopeAll') }}</option>
        </select>
      </div>

      <div class="field">
        <label for="remark">{{ t('Demo.form.remark') }}</label>
        <textarea
          id="remark"
          v-model="form.remark"
          rows="3"
          :placeholder="t('Demo.form.remarkPlaceholder')"
        />
      </div>
    </form>

    <h2>{{ t('Demo.form.valuesTitle') }}</h2>
    <table class="table">
      <tbody>
        <tr>
          <th>{{ t('Demo.form.name') }}</th>
          <td>{{ form.name || t('Demo.form.empty') }}</td>
        </tr>
        <tr>
          <th>{{ t('Demo.form.role') }}</th>
          <td>
            {{
              form.role === 'viewer'
                ? t('Demo.form.roleViewer')
                : form.role === 'editor'
                  ? t('Demo.form.roleEditor')
                  : t('Demo.form.roleAdmin')
            }}
          </td>
        </tr>
        <tr>
          <th>{{ t('Demo.form.scope') }}</th>
          <td>{{ form.scope }}</td>
        </tr>
        <tr>
          <th>{{ t('Demo.form.remark') }}</th>
          <td>{{ form.remark || t('Demo.form.empty') }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.field textarea {
  resize: vertical;
}
</style>
