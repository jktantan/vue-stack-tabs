import { createApp } from 'vue'
import 'normalize.css/normalize.css'
import App from './App.vue'
import router from './router'
import VueStackTabs from '@/lib'
const app = createApp(App)

app.use(router)
app.use(VueStackTabs)

app.mount('#app')
