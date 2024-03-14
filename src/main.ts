import { createApp } from 'vue'
import 'normalize.css/normalize.css'
import App from './App.vue'
import router from './router'
import VueStackTabs from '@/lib'
const app = createApp(App)

app.use(router)
app.use(VueStackTabs, [
  {
    locale: 'zh-TW',
    messages: {
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
  }
])

app.mount('#app')
