<script setup lang="ts">
import { useStackTab } from '@/lib'
import { ulid } from 'ulidx'
const { openNewTab } = useStackTab()
const openframe = (id: string) => {
  openNewTab({
    id,
    title: '面试',
    path: 'https://cn.vuejs.org/',
    iframe: true
  })
}
const openDashboard = (id: string) => {
  openNewTab({
    id,
    title: '首页',
    path: '/demo',
    closable: false
  })
}
const openTest2 = (id: string) => {
  const tabId = openNewTab({
    id,
    title: '测试2',
    path: '/demo/test2?saa=234234',
    closable: true
  })
  console.log('TEST2', tabId)
}
const openTest5 = (id: string) => {
  const tabId = openNewTab({
    id,
    title: '测试2',
    path: '/demo/test2?saa=123456',
    closable: true
  },true)
  console.log('TEST2', tabId)
}
const openTest3 = () => {
  const tabId = openNewTab({
    id: ulid(),
    title: '测试2',
    path: '/demo/test4/aaaa',
    closable: true
  })
  console.log('TEST2', tabId)
}
const open404 = () => {
  openNewTab({
    id: ulid(),
    title: '404',
    path: '/demo/ttttt',
    closable: true
  })
}
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
      <el-aside width="200px"
        ><el-menu default-active="2" class="el-menu-vertical-demo">
          <el-sub-menu index="1" title="Navigator One">
            <template #title>
              <span>样例</span>
            </template>
            <el-menu-item-group title="Group One">
              <el-menu-item index="1-1">item one</el-menu-item>
              <el-menu-item index="1-2">item two</el-menu-item>
            </el-menu-item-group>
            <el-menu-item-group title="Group Two">
              <el-menu-item index="1-3">item three</el-menu-item>
            </el-menu-item-group>
            <el-sub-menu index="1-4">
              <template #title>item four</template>
              <el-menu-item index="1-4-1">item one</el-menu-item>
            </el-sub-menu>
          </el-sub-menu>
          <el-menu-item index="2" @click="openDashboard('01HR6764M0NN996S2P510E5642')">
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="3" @click="openTest2('test2')">
            <span>页面2</span>
          </el-menu-item>
          <el-menu-item index="4" @click="openTest5('test2')">
            <span>页面3</span>
          </el-menu-item>
          <el-menu-item index="4" @click="open404">
            <span>404</span>
          </el-menu-item>
          <el-menu-item index="5" @click="openframe('01HR6764M0X9CZKNT15QH82TXY')">
            <span>IFrame页面</span>
          </el-menu-item>
        </el-menu></el-aside
      >
      <el-main style="padding: 5px">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped></style>
