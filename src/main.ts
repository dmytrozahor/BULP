import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: (to, from) => (to.path === from.path ? undefined : { top: 0 }),
  routes: [
    { path: '/', component: () => import('./views/SearchView.vue') },
    { path: '/w/:lemma', component: () => import('./views/WordView.vue'), props: true },
    { path: '/analyze', component: () => import('./views/AnalyzeView.vue') },
    { path: '/annotate', component: () => import('./views/AnnotateView.vue') },
    { path: '/corpus', component: () => import('./views/CorpusView.vue') },
    { path: '/method', component: () => import('./views/MethodView.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
})
createApp(App).use(router).mount('#app')
