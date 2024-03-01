<script setup lang="ts"></script>

<template>
  <el-container style="height: 100vh; width: 100vw">
    <el-header style="display: flex; align-items: center"
      ><div style="display: flex; align-items: center; gap: 10px">
        <img src="@/assets/logo.svg" height="25" width="25" />
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
              <span>Navigator One</span>
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
          <el-menu-item index="2">
            <span>页面1</span>
          </el-menu-item>
          <el-menu-item index="3">
            <span>页面2</span>
          </el-menu-item>
          <el-menu-item index="4">
            <span>页面3</span>
          </el-menu-item>
          <el-menu-item index="5">
            <span>IFrame页面</span>
          </el-menu-item>
        </el-menu></el-aside
      >
      <el-main style="padding: 5px"><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<style scoped></style>
