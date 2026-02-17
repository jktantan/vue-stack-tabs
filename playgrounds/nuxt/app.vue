<template>
  <div>
    <h1>Nuxt Playground (打包后验证)</h1>
    <vue-stack-tabs iframe-path="/iframe" :default-tabs="defaultTabs" />
  </div>
</template>

<script setup lang="ts">
const defaultTabs = [
  { title: '首页', path: '/', closable: false },
  { title: '关于', path: '/about', closable: true }
]
</script>
