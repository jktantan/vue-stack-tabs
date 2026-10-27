<!--
  Frame - 演示布局

  职责：包裹 vue-stack-tabs，提供默认标签和 iframe 路径配置
-->
<script setup lang="ts">
import type { ITabData } from '@/lib'

/** 固定首页：不可关闭、不可移动，其他标签不能排到它前面 */
const homeTab: ITabData = {
  id: '01HR6764M0NN996S2P510E5642',
  title: '首页',
  path: '/demo'
}
</script>

<template>
  <vue-stack-tabs
    :home-tab="homeTab"
    iframe-path="/demo/iframe"
    page-scroll="native"
    session-prefix="light"
  />
</template>
