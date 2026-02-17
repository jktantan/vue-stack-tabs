<!--
  IFrame - iframe 占位组件

  职责：路由 /iframe 的占位页，仅挂载 useTabRouter 以注入标签内路由能力
  说明：实际 iframe 内容由 StackTabs 在 iframeTabs 中渲染
-->
<script setup lang="ts">
import useTabRouter from './hooks/useTabRouter'
useTabRouter()
</script>
