<template>
  <div style="height: 100vh; display: flex; flex-direction: column">
    <h2 style="margin: 8px; flex-shrink: 0">Nuxt 3 Playground</h2>
    <div style="flex: 1; min-height: 0">
      <ClientOnly>
        <VueStackTabs iframe-path="/iframe" :default-tabs="defaultTabs" />
        <template #fallback>
          <div style="padding: 24px">加载中...</div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
const defaultTabs = [
  { title: '首页', path: '/', closable: false, refreshable: true },
  { title: '关于', path: '/about', closable: true, refreshable: true }
]
</script>
