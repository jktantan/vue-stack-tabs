<script setup lang="ts">
import { ref } from 'vue'
import ShadowProbe from '@/components/layout/ShadowProbe.vue'

const rows = ref(Array.from({ length: 40 }, (_, index) => `滚动内容第 ${index + 1} 项`))
</script>

<template>
  <shadow-probe>
    <h2>外部组件读取阴影状态</h2>
    <p>
      滚动页面，观察顶部状态栏的 <code>state</code>。它表示哪一侧还有内容，不是滚动方向。
      点击「关闭库阴影」后，库不再渲染阴影，但
      <code>state</code> 仍会继续更新；点击「恢复自动」后阴影重新显示。
    </p>
    <div v-for="row in rows" :key="row" class="shadow-test__row">
      {{ row }}
    </div>
  </shadow-probe>
</template>

<style scoped>
.shadow-test__row {
  padding: 16px;
  margin-bottom: 8px;
  background: var(--el-fill-color-light, #f5f7fa);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
}
</style>
