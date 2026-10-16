<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">公告 · Notice</p>
      <h1>v1.4.1 发布说明</h1>
      <p class="lead">这是一个普通的内容页，用来演示「同一路由可以被多个标签分别打开」。</p>
    </header>

    <div class="notice">
      <p><b>提示：</b>从控制台可以再打开一个「公告」标签，两个标签互不影响。</p>
    </div>

    <h2>本次变更</h2>
    <ul class="steps">
      <li>标签内前进 / 后退改为导航事务模型，失败时自动回滚栈与缓存。</li>
      <li>缓存驱逐统一在 <code>onActivated</code> / <code>evictMarkedCaches</code> 阶段处理。</li>
      <li>新增 <code>vue-stack-tabs/iframe-bridge</code> 子入口，iframe 内页无需引入样式。</li>
      <li>
        iframe 标签支持 <code>iframeRefreshMode</code>：<code>postMessage</code> 或
        <code>reload</code>。
      </li>
    </ul>

    <h2>接下来</h2>
    <p class="muted">
      回到「首页」标签，或从下方控制台继续打开其它演示标签。关闭标签后缓存会被驱逐，下次打开是全新的实例。
    </p>
  </section>
</template>
