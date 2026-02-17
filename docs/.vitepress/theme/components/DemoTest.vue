<template>
  <div class="demo-test">
    <h2>Demo 测试</h2>
    <p>如果你看到这个，说明 Vue 组件渲染正常。</p>
    <button @click="count++">点击次数: {{ count }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<style scoped>
.demo-test {
  padding: 20px;
  border: 2px solid #42b883;
  border-radius: 8px;
  margin: 20px 0;
}
button {
  padding: 10px 20px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
