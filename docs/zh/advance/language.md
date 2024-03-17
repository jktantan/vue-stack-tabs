# 国际化

## 配置

:::warning
VueStackTabs 默认支持英文(`en`)和中文(`zh-CN`)两种语言
:::
```vue
<template>
  <div class="app-header">头部</div>
  <div class="app-body">
    <div class="app-side">侧边栏</div>
    <vue-stack-tabs iframe-path="/iframe" i18n="zh-CN"/>
  </div>
</template>
```

## 自定义语言
`main.js` 入口文件

```javascript {14-31}
// router-tab 组件依赖 vue 
import { createApp } from 'vue'

// 引入组件和样式
import StackTabs from 'vue-stack-tabs'
import 'vue-stack-tab/dist/lib/vue-stack-tabs.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)
app.use(VueStackTabs,[{
  locale:'xxxx',
  messages:{
    VueStackTab: {
      close: 'Close',
      closeLefts: 'Close lefts',
      closeRights: 'Close rights',
      closeOthers: 'Close others',
      closeAll: 'Close all',
      reload: 'Reload',
      reloadAll: 'Reload all',
      maximum: 'Maximum',
      restore: 'Restore',
      undefined: 'Undefined',
      loading: 'Loading'
    }
  }
}])

app.mount('#app')
```