<!--
  Test2SubHome - 子路由默认页（试验性）

  对应路径：/demo/subroute
-->
<script setup lang="ts">
</script>

<template>
  <div class="test2-sub-home">
    <h3>子路由概览</h3>
    <p>这是 /demo/subroute 的默认子页面。点击上方导航可前往详情等子路由。</p>
    <p>每个子路径会被 keep-alive 独立缓存，切换 tab 再切回不会丢失状态。</p>
  </div>
</template>

<style scoped>
.test2-sub-home h3 {
  margin: 0 0 8px 0;
}
.test2-sub-home p {
  margin: 4px 0;
  color: #666;
}
</style>
