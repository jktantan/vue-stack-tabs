<script setup lang="ts">
import type { ITabData } from '@/lib'

const defaultTabs:ITabData[] = [{
  id:'01HR6764M0NN996S2P510E5642',
  title: '首页',
  path: '/demo',
  closable: false
}]
</script>

<template>
  <vue-stack-tabs :default-tabs="defaultTabs" iframe-path="/demo/iframe" />
</template>

<style scoped></style>
