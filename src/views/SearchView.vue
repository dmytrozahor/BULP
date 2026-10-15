<script setup lang="ts">
/**
 * Instant search over lemmas AND every historical spelling / paradigm form (stress- and case-insensitive via core/text.ts key();
 * Old letters ѣ ъ ы ѧ accepted). Results: lemma, first-attestation year + author, dots barometer. Unknown → /analyze.
 */
import { computed, ref, watch } from 'vue'
import Pagination from '../components/Pagination.vue'
import { usePage } from '../composables/usePage.ts'
import { useRoute, useRouter } from 'vue-router'
import { isKnown } from '../../core/evidence.ts'
import { search } from '../lib/search.ts'
import { authorInfo, useData } from '../composables/useData.ts'
import { fmtDate, fmtNum } from '../lib/format.ts'
import Dots from '../components/Dots.vue'
import AnalyzeView from './AnalyzeView.vue'   // UX-7: rule-based fallback for words outside the lexicon
import { plastSearch } from '../lib/sociolectData.ts'
const { loaded, loading, byLemma, searchIdx, cards, corpus, witnessById } = useData()
const route = useRoute(), router = useRouter()
const q = ref(String(route.query.q ?? ''))
const results = computed(() => (q.value.trim() ? search(searchIdx.value, q.value) : []))
const rows = computed(() => results.value.map(r => {
  const c = byLemma.value.get(r.lemma)!
  const fa = isKnown(c.first) ? c.first.value : undefined
  return { r, c, fa, who: fa ? authorInfo(fa.author, witnessById.value.get(fa.witness)).name : '' }
}))
const go = () => rows.value[0] && router.push(`/w/${encodeURIComponent(rows.value[0].c.lemma)}`)
// BL-2: switching the phone keyboard language blurs the field (IME/viewport resize); keep focus unless the user deliberately tapped elsewhere.
const box = ref<HTMLInputElement | null>(null)
let lastTap = 0
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { lastTap = Date.now() }, true)
const keepFocus = (e: FocusEvent) => {
  if (e.relatedTarget || Date.now() - lastTap < 600) return
  setTimeout(() => { if (document.visibilityState === 'visible' && !document.activeElement?.closest('a,button,summary,select,textarea')) box.value?.focus({ preventScroll: true }) }, 80)
}
/** SPEC 63 NV-1 (was F2 «показати ще»): results and the full lemma list are paged by `?p=`, never rendered at once */
const pgR = usePage(computed(() => rows.value.length)), pgL = usePage(computed(() => cards.value.length))
watch(q, () => { if (route.query.p !== undefined) pgR.go(1) })
const viaUk = { lemma: 'лема', form: 'історична форма', paradigm: 'словоформа' } as const
/** Plast vocabulary (SL-2) is searchable too — its words are mostly not corpus lemmas, so they never reached the lemma index */
const plast = computed(() => (q.value.trim() ? plastSearch(q.value, 10_000) : []))   // first 3 shown here, the rest on /plast
</script>

<template>
  <section class="hero">
    <h1>Звідки слово?</h1>
    <p class="muted">Лексикон словоформ із доказами: перша фіксація, історичні написання, мітки (церковнослов’янське, суржик, діалектне, розмовне) — кожна з джерелом і цитатою.
      <span class="sans small">Where does a Ukrainian word come from — every claim with its evidence.</span></p>
    <input ref="box" v-model="q" type="search" inputmode="search" enterkeyhint="search" @blur="keepFocus" placeholder="Знайти слово: князь, кънѧзь, видѣти, шо…" aria-label="Пошук слова" autofocus autocomplete="off" spellcheck="false" @keydown.enter="go" />
    <p class="small muted sans">Без урахування наголосу й регістру; приймає ѣ ъ ы ѧ. <template v-if="corpus">Корпус: {{ fmtNum(corpus.N) }} слів, {{ cards.length }} лем у словнику.</template></p>
  </section>

  <section v-if="plast.length" class="card" aria-live="polite">
    <h2><span>Пластова лексика</span> <span class="muted small">{{ plast.length }}</span></h2>
    <ul class="results">
      <li v-for="e in plast.slice(0, 3)" :key="e.src + e.loc">
        <RouterLink :to="`/source/${encodeURIComponent(e.src)}`">
          <span class="lem">{{ e.w }}</span>
          <span class="badge">{{ e.k === 'abbr' ? 'абревіатура' : 'пластова лексика' }}</span>
          <span class="small sans">«{{ e.g }}»</span>
          <span class="small muted sans">{{ e.loc }}<template v-if="e.byGloss"> · знайдено в тлумаченні</template></span>
        </RouterLink>
      </li>
    </ul>
    <p v-if="plast.length > 3" class="small sans"><RouterLink :to="{ path: '/plast', query: { q: q.trim() } }">усі {{ plast.length }} пластові збіги →</RouterLink></p>
  </section>
  <div v-if="!loaded"><div class="skeleton" v-for="i in 4" :key="i" /></div>
  <ul v-else-if="rows.length" class="results" aria-live="polite">
    <li v-for="{ r, c, fa, who } in pgR.slice(rows)" :key="c.lemma">
      <RouterLink :to="`/w/${encodeURIComponent(c.lemma)}`">
        <span class="lem">{{ c.lemma }}</span>
        <span class="muted small sans">{{ c.pos }}</span>
        <span v-if="r.matched !== c.lemma" class="small sans">знайдено: «{{ r.matched }}» ({{ viaUk[r.via] }})</span>
        <span v-if="fa" class="small sans">перша фіксація <strong>{{ fmtDate(fa.date) }}</strong> · {{ who }}</span>
        <span v-else class="unk">перша фіксація невідома</span>
        <Dots :dots="c.stats.dots" :ipm="c.stats.ipm" :hk="c.stats.hk" :f="c.stats.f" :N="corpus?.N" />
      </RouterLink>
    </li>
    <li v-if="pgR.pages.value > 1" class="pagerli"><Pagination :page="pgR.page.value" :pages="pgR.pages.value" :total="rows.length" @go="pgR.go" /></li>
  </ul>
  <template v-else-if="q.trim() && loaded">
    <div class="card" role="status">
      <p><strong>«{{ q.trim() }}» — немає в корпусі, аналіз за правилами.</strong> Це не словникова стаття: нижче лише розбір за правилами з джерелами (будова, деривація, шлях запозичення, омографи, русинська, IPA); «невідомо» ≠ «літературне».</p>
      <p class="small sans"><RouterLink :to="{ path: '/analyze', query: { q: q.trim() } }">Відкрити в «Аналізі слова» →</RouterLink></p>
    </div>
    <AnalyzeView :embed="q.trim()" />
  </template>
  <div v-else-if="loaded" class="card">
    <h2>Усі леми ({{ cards.length }})</h2>
    <div class="chips"><RouterLink v-for="c in pgL.slice(cards)" :key="c.lemma" class="chip" :to="`/w/${encodeURIComponent(c.lemma)}`" style="text-decoration:none">{{ c.lemma }}</RouterLink></div>
    <Pagination :page="pgL.page.value" :pages="pgL.pages.value" @go="pgL.go" />
    <p class="small muted sans" style="margin-top:.8rem">Спробуйте <a href="#/annotate">анотатор тексту</a> на прикладах із пам’яток корпусу.</p>
  </div>
</template>
