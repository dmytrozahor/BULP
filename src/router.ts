import { createRouter, createWebHashHistory, createMemoryHistory, type RouteRecordRaw } from 'vue-router'

/** The route table, separate from the app bootstrap so tests/nav.test.ts can walk it (BL-16: no element type is a dead end). */
export const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('./views/SearchView.vue') },
  { path: '/w/:lemma', component: () => import('./views/WordView.vue'), props: true },
  { path: '/f/:form', component: () => import('./views/FormView.vue'), props: true },
  { path: '/forms/:rule', component: () => import('./views/RuleFormsView.vue'), props: true },
  { path: '/name/:id', component: () => import('./views/TorotCardView.vue'), props: r => ({ id: r.params.id, kind: 'name' }) },
  { path: '/orv/:id', component: () => import('./views/TorotCardView.vue'), props: r => ({ id: r.params.id, kind: 'orv' }) },
  { path: '/ar/:id', component: () => import('./views/ArchaicView.vue'), props: true },
  { path: '/lw/:lemma', component: () => import('./views/LightWordView.vue'), props: true },
  { path: '/witness/:id', component: () => import('./views/WitnessView.vue'), props: true },
  { path: '/author/:id', component: () => import('./views/AuthorView.vue'), props: true },
  { path: '/source/:id', component: () => import('./views/SourceView.vue'), props: true },
  { path: '/analyze', component: () => import('./views/AnalyzeView.vue') },
  { path: '/derive', component: () => import('./views/DeriveView.vue') },
  { path: '/annotate', component: () => import('./views/AnnotateView.vue') },
  { path: '/texts', component: () => import('./views/TextsView.vue') },
  { path: '/songs/:id?', component: () => import('./views/SongsView.vue'), props: true },
  { path: '/phrases', component: () => import('./views/PhrasesView.vue') },
  { path: '/p/:id', component: () => import('./views/PhraseView.vue'), props: true },
  { path: '/sophia', component: () => import('./views/SophiaView.vue') },
  { path: '/map', component: () => import('./views/MapView.vue') },
  { path: '/corpus', component: () => import('./views/CorpusView.vue') },
  { path: '/report', component: () => import('./views/ReportView.vue') },
  { path: '/method', component: () => import('./views/MethodView.vue') },
  { path: '/:rest(.*)*', name: 'catch-all', redirect: '/' },
]

export const makeRouter = (memory = false) => createRouter({
  history: memory ? createMemoryHistory() : createWebHashHistory(),
  scrollBehavior: (to, from) => (to.hash ? { el: to.hash, behavior: 'smooth' } : to.path === from.path ? undefined : { top: 0 }),
  routes,
})
