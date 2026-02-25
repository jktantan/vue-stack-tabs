import { createApp } from 'vue'
import VueStackTabs from 'vue-stack-tabs'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(VueStackTabs)
app.mount('#app')
