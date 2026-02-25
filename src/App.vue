<!--
  App - 演示应用根组件

  职责：布局（el-container）、侧边栏导航、调用 useTabActions 打开各类标签
-->
<script setup lang="ts">
import { useTabActions } from '@/lib'
import { ulid } from 'ulid'
import { onMounted, onUnmounted } from 'vue'
const { openTab } = useTabActions()

const handleOpen = (path: string, title: string, stableId?: string, refresh?: boolean) => {
  // 使用稳定的 ID：如果调用方传入 stableId 则用它，否则用 path 作为唯一标识
  // 这样确保同一个菜单项反复点击时不会不断创建新 Tab，而是激活已有的 Tab
  const id = stableId || path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32)
  openTab(
    {
      id,
      title,
      path,
      closable: true
    },
    refresh
  )
}

const openframe = (path: string, id: string) => {
  openTab({
    id,
    title: 'iframe 集群',
    path,
    iframe: true
  })
}

// 监听 iframe 传出来的事件
const messageListener = (e: MessageEvent) => {
  if (e.data?.type === 'openTab' && e.data?.payload) {
    const { id, title, path, closable } = e.data.payload
    openTab({ id: id || ulid(), title, path, closable }, e.data.refresh)
  }
}

onMounted(() => {
  window.addEventListener('message', messageListener)
})
onUnmounted(() => {
  window.removeEventListener('message', messageListener)
})
</script>

<template>
  <el-container style="height: 100vh; width: 100vw">
    <el-header style="display: flex; align-items: center"
      ><div style="display: flex; align-items: center; gap: 10px">
        <img src="@/assets/logo.svg" height="40" />
        <h2>Vue Stack Tabs</h2>
      </div>
      <div style="flex: 1 1 0; display: flex; justify-content: flex-end; gap: 10px">
        <div>Header</div>
        <div>Header</div>
      </div></el-header
    >
    <el-container>
      <el-aside width="220px">
        <el-menu default-active="2" class="el-menu-vertical-demo">
          <el-sub-menu index="basic">
            <template #title><span>基础 5 页签切换测试</span></template>
            <el-menu-item index="b1" @click="handleOpen('/demo/page1', 'Page 1')"
              >页面 1 (输入测试)</el-menu-item
            >
            <el-menu-item index="b2" @click="handleOpen('/demo/page2', 'Page 2')"
              >页面 2 (多行缓存)</el-menu-item
            >
            <el-menu-item index="b3" @click="handleOpen('/demo/page3', 'Page 3')"
              >页面 3 (表单单选)</el-menu-item
            >
            <el-menu-item index="b4" @click="handleOpen('/demo/page4', 'Page 4')"
              >页面 4 (下拉缓存)</el-menu-item
            >
            <el-menu-item index="b5" @click="handleOpen('/demo/page5', 'Page 5')"
              >页面 5 (开关滑块)</el-menu-item
            >
          </el-sub-menu>

          <el-sub-menu index="internal">
            <template #title><span>内联与回退缓存测试</span></template>
            <el-menu-item index="i0" @click="handleOpen('/demo/url-test/home', '多组件URL回退')"
              >多层级 URL 精准回退验证</el-menu-item
            >
            <el-menu-item index="i1" @click="handleOpen('/demo/internal', '内部路由流转')"
              >内部 Push/Back 验证</el-menu-item
            >
            <el-menu-item
              index="i2"
              @click="handleOpen('/demo/multi-tab?id=1', '独立页签-1', 'same1')"
              >同路由不同参隔离 (id=1)</el-menu-item
            >
            <el-menu-item
              index="i21"
              @click="handleOpen('/demo/loading-test', 'Loading测试', 'loading')"
              >Loading API 测试</el-menu-item
            >
            <el-menu-item
              index="i3"
              @click="handleOpen('/demo/multi-tab?id=2', '独立页签-2', 'same2')"
              >同路由不同参隔离 (id=2)</el-menu-item
            >
            <el-menu-item index="i4" @click="handleOpen('/demo/scroll', '滚动条精读')"
              >极长内容页面还原</el-menu-item
            >
          </el-sub-menu>

          <el-sub-menu index="iframes">
            <template #title><span>IFrame 沙盒簇测试</span></template>
            <el-menu-item index="f1" @click="openframe('/iframe-child.html', 'iframe_1')"
              >Iframe 内置代理 (postMessage)</el-menu-item
            >
            <el-menu-item index="f2" @click="openframe('https://cn.vuejs.org/', 'iframe_2')"
              >独立外部网页并存测试</el-menu-item
            >
          </el-sub-menu>

          <el-sub-menu index="dynamic">
            <template #title><span>复杂 API 状态控制测试</span></template>
            <el-menu-item index="d1" @click="handleOpen('/demo/opener', '跨界唤起')"
              >带/不带 Refresh 换起器</el-menu-item
            >
            <el-menu-item index="d2" @click="handleOpen('/demo/dynamic-title', '动态变脸')"
              >运行时自突变 Title</el-menu-item
            >
          </el-sub-menu>

          <el-menu-item index="err" @click="handleOpen('/demo/not-exist-route', '空位')">
            <span>缺失兜底 (抛出 404)</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main style="padding: 5px">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped></style>
