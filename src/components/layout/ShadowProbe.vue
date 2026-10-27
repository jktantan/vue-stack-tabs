<!--
  ShadowProbe - 阴影 API 外部可用性验证

  这个组件包在页面内容外层，本身不是路由 page。
  它通过 useTabScrollShadow() 读取当前页的阴影方向，并提供开关按钮，
  用来验证非 page 组件也能正常注入阴影控制器。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useTabScrollShadow } from '@/lib'

const shadow = useTabScrollShadow()

const labels = {
  none: '无阴影',
  top: '上方还有内容',
  bottom: '下方还有内容',
  both: '上下都有内容'
} as const

const stateLabel = computed(() => labels[shadow.state.value])
</script>

<template>
  <div class="shadow-probe">
    <div class="shadow-probe__bar">
      <strong>外层组件读取</strong>
      <span class="shadow-probe__state">
        state: <code>{{ shadow.state.value }}</code
        >（{{ stateLabel }}）
      </span>
      <span
        >enabled: <code>{{ shadow.enabled.value }}</code></span
      >
      <el-button size="small" @click="shadow.setEnabled(false)">关闭库阴影</el-button>
      <el-button size="small" @click="shadow.reset()">恢复自动</el-button>
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
  padding: 10px 14px;
  background: var(--el-bg-color, #fff);
  border-bottom: 1px solid var(--el-border-color, #dcdfe6);
}

.shadow-probe__state {
  min-width: 220px;
}

.shadow-probe__content {
  padding: 20px;
}
</style>
