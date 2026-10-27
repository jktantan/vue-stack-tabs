<!--
  ShadowProbe - 文档演示中的阴影 API 外部可用性验证

  这个组件包在页面内容外层，本身不是路由 page。
  它通过 useTabScrollShadow() 读取当前页的阴影方向，并提供开关按钮，
  用来确认非 page 组件也能正常注入阴影控制器。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n-lite'
import { useTabScrollShadow } from 'vue-stack-tabs'

const { t } = useI18n()
const shadow = useTabScrollShadow()

const labels = computed(() => ({
  none: t('Demo.shadow.noneHint'),
  top: t('Demo.shadow.topHint'),
  bottom: t('Demo.shadow.bottomHint'),
  both: t('Demo.shadow.bothHint')
}))

const stateLabel = computed(() => labels.value[shadow.state.value])
</script>

<template>
  <div class="shadow-probe">
    <div class="shadow-probe__bar">
      <strong>{{ t('Demo.shadow.probeTitle') }}</strong>
      <span class="shadow-probe__state">
        {{ t('Demo.shadow.state') }}: <code>{{ shadow.state.value }}</code
        >（{{ stateLabel }}）
      </span>
      <span
        >{{ t('Demo.shadow.enabled') }}: <code>{{ shadow.enabled.value }}</code></span
      >
      <button class="demo-btn" type="button" @click="shadow.setEnabled(false)">
        {{ t('Demo.shadow.disable') }}
      </button>
      <button class="demo-btn" type="button" @click="shadow.reset()">
        {{ t('Demo.shadow.restore') }}
      </button>
    </div>
    <div class="shadow-probe__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.shadow-probe {
  min-height: 100%;
}

.shadow-probe__bar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  background: var(--demo-surface);
  border-bottom: 1px solid var(--demo-border);
  font-size: 13px;
  color: var(--demo-text);
}

.shadow-probe__state {
  min-width: 200px;
}

.shadow-probe__content {
  min-height: 100%;
}
</style>
