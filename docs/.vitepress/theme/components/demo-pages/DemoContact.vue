<template>
  <div class="demo-page">
    <h1>📧 联系与支持</h1>
    <div class="content">
      <div class="cards">
        <div class="card">
          <div class="icon">🐙</div>
          <h3>GitHub</h3>
          <p>报告问题、贡献代码</p>
          <a href="https://github.com/jktantan/vue-stack-tabs" target="_blank">访问仓库 →</a>
        </div>
        
        <div class="card">
          <div class="icon">📚</div>
          <h3>文档</h3>
          <p>完整的使用指南和 API 参考</p>
          <a href="/vue-stack-tabs/" target="_blank">查看文档 →</a>
        </div>
        
        <div class="card">
          <div class="icon">💬</div>
          <h3>讨论区</h3>
          <p>提问和分享经验</p>
          <a href="https://github.com/jktantan/vue-stack-tabs/discussions" target="_blank">加入讨论 →</a>
        </div>
      </div>
      
      <div class="info">
        <h2>关于作者</h2>
        <p>Vue Stack Tabs 由 <strong>tantan</strong> 维护，欢迎社区贡献！</p>
      </div>
      
      <div class="info">
        <h2>许可协议</h2>
        <p>本项目采用 <strong>Apache License 2.0</strong> 许可，可用于个人和商业项目。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-page {
  padding: 40px;
  max-width: 1000px;
  margin: 0 auto;
}

h1 {
  font-size: 28px;
  margin-bottom: 32px;
  color: #2c3e50;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.card {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  text-align: center;
  transition: transform 0.3s;
}

.card:hover {
  transform: translateY(-4px);
}

.card .icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.card h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #2c3e50;
}

.card p {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.card a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.card a:hover {
  color: #764ba2;
}

.info {
  background: #f8f9fa;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.info h2 {
  font-size: 20px;
  color: #667eea;
  margin-bottom: 12px;
}

.info p {
  line-height: 1.8;
  color: #555;
  margin: 0;
}
</style>
