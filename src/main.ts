import { createApp } from 'vue'
import App from './App.vue'
import { makeRouter } from './router.ts'
import './style.css'
import './ux.css'

createApp(App).use(makeRouter()).mount('#app')
