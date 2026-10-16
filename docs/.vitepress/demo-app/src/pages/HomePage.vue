<script setup lang="ts">
import { useTabActions } from 'vue-stack-tabs'

const { openTab } = useTabActions()

const open = (id: string, title: string, path: string) => {
  void openTab({ id, title, path }).catch(() => undefined)
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">在线演示 · Live demo</p>
      <h1>每个标签页，都是一份独立的 Vue 作用域</h1>
      <p class="lead">
        左侧标签栏里的每个标签都持有自己的页面实例、缓存与导航栈，互不干扰——这就是
        <code>vue-stack-tabs</code> 用 Vue 作用域替代「一个标签一个 iframe」的方式。
      </p>
    </header>

    <div class="grid">
      <article class="card">
        <h3>打开标签</h3>
        <p>用 <code>openTab</code> 打开任意路由；同 id 会复用并激活已有标签。</p>
      </article>
      <article class="card">
        <h3>标签内前进 / 后退</h3>
        <p>标签内是栈式导航，前进压栈、后退出栈并驱逐缓存。</p>
      </article>
      <article class="card card--accent">
        <h3>状态不会丢</h3>
        <p>表单输入与滚动位置会随标签缓存保留，切走再回来还在原处。</p>
      </article>
    </div>

    <h2>建议的体验顺序</h2>
    <ol class="steps">
      <li>
        点下方「报表列表」，再点其中一行的<b>查看详情</b>，然后后退——观察标签内的前进/后退栈。
      </li>
      <li>点「打开 3 个报表标签」——三个标签指向同一路由的不同参数，各自独立缓存。</li>
      <li>点「表单」输入一些内容，切到别的标签再切回来，输入仍在。</li>
      <li>点「长列表」滚到中段，切走再切回来——滚动位置被记住。</li>
      <li>点「打开 iframe 标签」——iframe 内的页面可反过来请求父窗口打开新标签。</li>
    </ol>

    <div class="actions">
      <button
        class="demo-btn demo-btn--primary"
        type="button"
        @click="open('report', '报表列表', '/report')"
      >
        报表列表
      </button>
      <button class="demo-btn" type="button" @click="open('form', '表单', '/form')">表单</button>
      <button class="demo-btn" type="button" @click="open('scroll', '长列表', '/scroll')">
        长列表
      </button>
      <button class="demo-btn" type="button" @click="open('notice', '公告', '/notice')">
        公告
      </button>
    </div>
  </section>
</template>
