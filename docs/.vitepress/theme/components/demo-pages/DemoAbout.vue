<template>
  <div class="demo-page">
    <h1>📄 关于 Vue Stack Tabs</h1>
    <div class="content">
      <section>
        <h2>什么是 Vue Stack Tabs?</h2>
        <p>Vue Stack Tabs 是一个强大的 Vue 3 标签页管理库，为应用提供类似浏览器的多标签页界面。</p>
      </section>
      
      <section>
        <h2>核心特性</h2>
        <ul>
          <li>✅ <strong>状态保持</strong>：切换标签时保持组件状态</li>
          <li>✅ <strong>滚动记忆</strong>：自动记忆和恢复滚动位置</li>
          <li>✅ <strong>栈式导航</strong>：标签内的前进和后退</li>
          <li>✅ <strong>iframe 支持</strong>：嵌入外部网站</li>
          <li>✅ <strong>灵活操作</strong>：编程式管理标签</li>
          <li>✅ <strong>TypeScript</strong>：完整的类型支持</li>
        </ul>
      </section>
      
      <section>
        <h2>使用场景</h2>
        <div class="use-cases">
          <div class="case">
            <div class="emoji">🏢</div>
            <h3>后台管理系统</h3>
            <p>适合复杂的后台界面</p>
          </div>
          <div class="case">
            <div class="emoji">💼</div>
            <h3>SaaS 应用</h3>
            <p>同时管理多个工作区</p>
          </div>
          <div class="case">
            <div class="emoji">📊</div>
            <h3>数据分析</h3>
            <p>并排查看不同报表</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.demo-page {
  padding: 40px;
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  font-size: 28px;
  margin-bottom: 24px;
  color: #2c3e50;
}

section {
  margin-bottom: 32px;
}

section h2 {
  font-size: 20px;
  color: #667eea;
  margin-bottom: 12px;
}

section p {
  line-height: 1.8;
  color: #555;
}

section ul {
  list-style: none;
  padding: 0;
}

section ul li {
  line-height: 2;
  color: #555;
}

.use-cases {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.case {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  text-align: center;
}

.case .emoji {
  font-size: 40px;
  margin-bottom: 8px;
}

.case h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.case p {
  font-size: 14px;
  color: #666;
  margin: 0;
}
</style>
