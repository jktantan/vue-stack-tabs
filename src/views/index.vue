<script setup lang="ts">
import { useTabActions } from '@/lib'
const { openTab } = useTabActions()
openTab({
  id: '01HR6764M0NN996S2P510E5642',
  title: '首页',
  path: '/demo',
  closable: false
})
</script>

<template>
  <div />
</template>

<style scoped></style>
