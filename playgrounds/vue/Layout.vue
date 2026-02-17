<template>
  <vue-stack-tabs iframe-path="/iframe" :default-tabs="defaultTabs" />
</template>

<script setup lang="ts">
const defaultTabs = [
  { title: '首页', path: '/', closable: false },
  { title: '关于', path: '/about', closable: true }
]
</script>
