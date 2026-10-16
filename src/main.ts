import { createApp } from 'vue'
import App from './App.vue'
import { makeRouter } from './router.ts'
import './style.css'
import './ux.css'

createApp(App).use(makeRouter()).mount('#app')

/** SPEC 63 PF-2: a service worker keeps the shards the visitor has seen (public/sw.js); registered after load so it never competes with the first paint */
if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator)
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* private mode / http: the site works without it */ }) })
