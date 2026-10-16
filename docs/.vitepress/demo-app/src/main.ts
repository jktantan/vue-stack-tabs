import { createApp } from 'vue'
import VueStackTabs from 'vue-stack-tabs'
import App from './App.vue'
import { router } from './router'
import './styles.css'

createApp(App).use(router).use(VueStackTabs).mount('#app')
