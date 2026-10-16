<template>
  <div class="demo-page scroll">
    <h1>📜 滚动位置演示</h1>
    <p>向下滚动，然后切换到其他标签再回来。你会发现滚动位置被自动保存了！</p>

    <div class="scroll-content">
      <div v-for="i in 50" :key="i" class="scroll-item">
        <h3>区块 {{ i }}</h3>
        <p>这是第 {{ i }} 个区块。Vue Stack Tabs 会自动保存你的滚动位置。</p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-page.scroll {
  padding: 40px;
}

h1 {
  color: #667eea;
  margin-bottom: 16px;
}

.scroll-content {
  margin-top: 24px;
}

.scroll-item {
  background: white;
  padding: 24px;
  margin: 16px 0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.scroll-item h3 {
  color: #333;
  margin-bottom: 8px;
}

.scroll-item p {
  color: #666;
  line-height: 1.6;
  margin: 8px 0;
}
</style>
