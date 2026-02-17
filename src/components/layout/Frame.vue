<!--
  Frame - 演示布局

  职责：包裹 vue-stack-tabs，提供默认标签和 iframe 路径配置
-->
<script setup lang="ts">
import type { ITabData } from '@/lib'

/** 默认打开的标签，首页为不可关闭 */
const defaultTabs: ITabData[] = [
  {
    id: '01HR6764M0NN996S2P510E5642',
    title: '首页',
    path: '/demo',
    closable: false
  }
]
</script>

<template>
  <vue-stack-tabs
    :default-tabs="defaultTabs"
    iframe-path="/demo/iframe"
    global-scroll
    session-prefix="light"
  />
</template>

<style scoped></style>
