<script setup lang="ts">
import { reactive } from 'vue'

const form = reactive({
  name: '',
  role: 'viewer',
  scope: '本部门',
  remark: ''
})
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">表单 · Form</p>
      <h1>状态保持</h1>
      <p class="lead">
        输入一些内容，然后切到别的标签（或点关闭其它标签）再切回来——这些值不会丢，因为标签的页面实例被
        keep-alive 缓存着。
      </p>
    </header>

    <form class="card" @submit.prevent>
      <div class="field">
        <label for="name">姓名</label>
        <input id="name" v-model="form.name" type="text" placeholder="试试输入你的名字" />
      </div>

      <div class="field">
        <label for="role">角色</label>
        <select id="role" v-model="form.role">
          <option value="viewer">只读</option>
          <option value="editor">编辑</option>
          <option value="admin">管理员</option>
        </select>
      </div>

      <div class="field">
        <label for="scope">可见范围</label>
        <select id="scope" v-model="form.scope">
          <option>本部门</option>
          <option>本公司</option>
          <option>全部</option>
        </select>
      </div>

      <div class="field">
        <label for="remark">备注</label>
        <textarea id="remark" v-model="form.remark" rows="3" placeholder="多行内容同样会被保留" />
      </div>
    </form>

    <h2>当前表单值</h2>
    <table class="table">
      <tbody>
        <tr>
          <th>姓名</th>
          <td>{{ form.name || '（空）' }}</td>
        </tr>
        <tr>
          <th>角色</th>
          <td>{{ form.role }}</td>
        </tr>
        <tr>
          <th>可见范围</th>
          <td>{{ form.scope }}</td>
        </tr>
        <tr>
          <th>备注</th>
          <td>{{ form.remark || '（空）' }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.field textarea {
  resize: vertical;
}
</style>
