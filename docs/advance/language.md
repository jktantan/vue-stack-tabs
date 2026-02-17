# Internationalization (i18n)

## Configuration

::: warning
VueStackTabs supports `en` and `zh-CN` by default.
:::

```vue:line-numbers
<template>
  <vue-stack-tabs iframe-path="/iframe" i18n="zh-CN" />
</template>
```

## Custom Locale

`main.ts`:

```javascript:line-numbers {14-31}
import { createApp } from 'vue'
import VueStackTabs from 'vue-stack-tabs'
import 'vue-stack-tabs/dist/style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(VueStackTabs, [{
  locale: 'xxxx',
  messages: {
    VueStackTab: {
      close: 'Close',
      closeLeft: 'Close left',
      closeRight: 'Close right',
      closeOthers: 'Close others',
      closeAll: 'Close all',
      reload: 'Reload',
      reloadAll: 'Reload all',
      maximum: 'Maximum',
      restore: 'Restore',
      undefined: 'Undefined',
      loading: 'Loading',
      openInNewWindow: 'Open in new window'
    }
  }
}])
app.mount('#app')
```
