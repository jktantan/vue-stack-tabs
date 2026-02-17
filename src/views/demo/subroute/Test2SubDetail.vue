<!--
  Test2SubDetail - 子路由详情页（试验性）

  对应路径：/demo/subroute/detail 或 /demo/subroute/detail/:id
-->
<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const detailId = route.params.id ?? '-'
</script>

<template>
  <div class="test2-sub-detail">
    <h3>子路由详情</h3>
    <p>当前路径：{{ route.path }}</p>
    <p v-if="route.params.id">ID 参数：{{ detailId }}</p>
  </div>
</template>

<style scoped>
.test2-sub-detail h3 {
  margin: 0 0 8px 0;
}
.test2-sub-detail p {
  margin: 4px 0;
  color: #666;
}
</style>
