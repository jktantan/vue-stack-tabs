<script setup lang="ts">
import { useTabRouter } from 'vue-stack-tabs'

const { forward } = useTabRouter()

/** 后退时由详情页传来的结果，通过 props._back 接收 */
defineProps<{ _back?: { picked?: string } }>()

const rows = [
  { id: 'R-1042', customer: '蓝湾科技', amount: '¥128,400', state: '已结算' },
  { id: 'R-1043', customer: '长汀制造', amount: '¥56,900', state: '待审核' },
  { id: 'R-1044', customer: '南屿物流', amount: '¥318,200', state: '已结算' },
  { id: 'R-1045', customer: '合溪能源', amount: '¥74,150', state: '待审核' },
  { id: 'R-1046', customer: '禾间材料', amount: '¥9,800', state: '已作废' }
]

const openDetail = (id: string) => {
  // 标签内前进：压入当前标签的页面栈，可反复入栈同一路由的不同参数
  forward({ path: `/report/${id}` })
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <p class="eyebrow">报表 · Report</p>
      <h1>报表列表</h1>
      <p class="lead">
        点「查看详情」会在<b>当前标签内前进</b>（<code>useTabRouter().forward</code>）——同一个标签里形成一条页面栈，而不是新开标签。
      </p>
    </header>

    <p v-if="_back?.picked" class="notice">
      <b>收到回退参数：</b>详情页通过 <code>backward(path, params)</code> 传回了
      <code>{{ _back.picked }}</code
      >。
    </p>

    <table class="table">
      <thead>
        <tr>
          <th>单号</th>
          <th>客户</th>
          <th>金额</th>
          <th>状态</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.customer }}</td>
          <td>{{ row.amount }}</td>
          <td>
            <span class="tag">{{ row.state }}</span>
          </td>
          <td>
            <button class="demo-btn" type="button" @click="openDetail(row.id)">查看详情</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="actions">
      <button class="demo-btn" type="button" @click="openDetail('R-1042')">
        连续前进：详情 R-1042
      </button>
      <button class="demo-btn" type="button" @click="openDetail('R-1044')">
        连续前进：详情 R-1044
      </button>
    </div>
  </section>
</template>
