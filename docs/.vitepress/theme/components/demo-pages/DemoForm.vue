<template>
  <div class="demo-page">
    <h1>📝 表单状态演示</h1>
    <p>填写下面的表单，然后切换到其他标签再回来。你的输入内容会被保持！</p>

    <form class="demo-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>姓名 / Name:</label>
        <input v-model="form.name" type="text" placeholder="请输入姓名" />
      </div>

      <div class="form-group">
        <label>邮箱 / Email:</label>
        <input v-model="form.email" type="email" placeholder="请输入邮箱" />
      </div>

      <div class="form-group">
        <label>留言 / Message:</label>
        <textarea v-model="form.message" rows="5" placeholder="请输入留言内容"></textarea>
      </div>

      <div class="form-group">
        <label>类别 / Category:</label>
        <select v-model="form.category">
          <option value="">请选择...</option>
          <option value="bug">Bug 报告</option>
          <option value="feature">功能建议</option>
          <option value="question">问题咨询</option>
        </select>
      </div>

      <button type="submit" class="btn-submit">提交 / Submit</button>
    </form>

    <div v-if="submitted" class="success-message">
      ✅ 表单数据已保存！姓名: {{ form.name }}, 邮箱: {{ form.email }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const form = ref({
  name: '',
  email: '',
  message: '',
  category: ''
})

const submitted = ref(false)

const handleSubmit = () => {
  submitted.value = true
  setTimeout(() => (submitted.value = false), 3000)
}
</script>

<style scoped>
.demo-page {
  padding: 40px;
  max-width: 600px;
}

h1 {
  color: #667eea;
  margin-bottom: 16px;
}

.demo-form {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-top: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.btn-submit {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-submit:hover {
  transform: translateY(-2px);
}

.success-message {
  margin-top: 20px;
  padding: 16px;
  background: #d4edda;
  color: #155724;
  border-radius: 8px;
}
</style>
