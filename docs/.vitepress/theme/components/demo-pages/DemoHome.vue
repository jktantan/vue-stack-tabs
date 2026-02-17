<template>
  <div class="demo-page home">
    <h1>🎉 欢迎使用 Vue Stack Tabs</h1>
    <p class="subtitle">一个强大的 Vue 3 多标签页管理库</p>
    
    <div class="features">
      <div class="feature">
        <div class="icon">📑</div>
        <h3>多标签管理</h3>
        <p>轻松打开和管理多个标签</p>
      </div>
      <div class="feature">
        <div class="icon">🔄</div>
        <h3>状态保持</h3>
        <p>切换标签时保持组件状态</p>
      </div>
      <div class="feature">
        <div class="icon">📜</div>
        <h3>滚动记忆</h3>
        <p>自动保存和恢复滚动位置</p>
      </div>
      <div class="feature">
        <div class="icon">🌐</div>
        <h3>iframe 支持</h3>
        <p>可以嵌入外部网站</p>
      </div>
    </div>
    
    <div class="cta">
      <p>👆 使用上方按钮体验各种功能</p>
    </div>
  </div>
</template>

<style scoped>
.demo-page.home {
  padding: 40px;
  text-align: center;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  min-height: 400px;
}

h1 {
  font-size: 32px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 18px;
  color: #666;
  margin-bottom: 40px;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin: 40px 0;
}

.feature {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.feature .icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.feature h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #333;
}

.feature p {
  color: #666;
  font-size: 14px;
}

.cta {
  margin-top: 40px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.cta p {
  margin: 0;
  font-size: 16px;
  color: #667eea;
}
</style>
