<script setup lang="ts">
/**
 * Instant search over lemmas AND every historical spelling / paradigm form (stress- and case-insensitive via core/text.ts key();
 * Old letters ѣ ъ ы ѧ accepted). Results: lemma, first-attestation year + author, dots barometer. Unknown → /analyze.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import Pagination from '../components/Pagination.vue'
import { usePage } from '../composables/usePage.ts'
import { useRoute, useRouter } from 'vue-router'
import { isKnown } from '../../core/evidence.ts'
import { queryKeys, type Result } from '../lib/search.ts'
import { ixCards, lemmaPage, searchDict, searchRemote, type DictHit, type RemoteResult } from '../lib/parts.ts'
import { wordCardTo } from '../lib/cardIndex.ts'
import { cardRoute, DICT_STATUS } from '../../core/cv.ts'
import { LEMMA_PAGE } from '../../core/parts.ts'
import { authorInfo, useData } from '../composables/useData.ts'
import { fmtDate, fmtNum } from '../lib/format.ts'
import Dots from '../components/Dots.vue'
import AnalyzeView from './AnalyzeView.vue'   // UX-7: rule-based fallback for words outside the lexicon
import { plastSearch } from '../lib/sociolectData.ts'
import { uvSearch, type UvHit } from '../lib/uvData.ts'
const { loaded, byLemma, corpus, witnessById, searchIdx } = useData()
const route = useRoute(), router = useRouter()
const q = ref(String(route.query.q ?? ''))
/** SPEC 63 PF-1: one prefix shard per keystroke (ix/), never the whole lexicon */
const none: RemoteResult = { lemmas: [], cards: [] }
const remote = shallowRef<RemoteResult>(none), searching = ref(false)
let seq = 0
watch(q, async v => {
  const t = v.trim(), n = ++seq
  if (!t) { remote.value = none; searching.value = false; return }
  searching.value = true
  const r = await searchRemote(t, queryKeys)
  if (n === seq) { remote.value = r; searching.value = false }
}, { immediate: true })
/** SPEC 63 DO-4: dictionary-only cards come from dx/ and are listed AFTER every corpus-attested result, never before or between */
const dictHits = shallowRef<DictHit[]>([]), dseq = ref(0)
watch(q, async v => {
  const t = v.trim(), n = ++dseq.value
  if (!t) { dictHits.value = []; return }
  const r = await searchDict(t, queryKeys).catch(() => [] as DictHit[])
  if (n === dseq.value) dictHits.value = r
}, { immediate: true })
const rows = computed(() => remote.value.lemmas)
const dictRows = computed(() => { const seen = new Set([...rows.value.map(r => r.lemma), ...remote.value.cards.map(c => c.id)]); return dictHits.value.filter(d => !seen.has(d.id)) })
/** the core card behind a result row (cd shard, fetched for the rows on screen only) */
const info = (r: Result) => {
  const c = byLemma.value.get(r.lemma), fa = c && isKnown(c.first) ? c.first.value : undefined
  return { c, fa, who: fa ? authorInfo(fa.author, witnessById.value.get(fa.witness)).name : '' }
}
const cardHits = computed(() => remote.value.cards)   // SPEC 63 CV-2: light (/lw), dictionary-attested (CV) and archaic (/ar) cards, same shards
const go = () => rows.value[0] ? router.push(`/w/${encodeURIComponent(rows.value[0].lemma)}`) : cardHits.value[0] ? router.push(cardRoute(cardHits.value[0])) : dictRows.value[0] && router.push(cardRoute(dictRows.value[0]))
// BL-2: switching the phone keyboard language blurs the field (IME/viewport resize); keep focus unless the user deliberately tapped elsewhere.
const box = ref<HTMLInputElement | null>(null)
let lastTap = 0
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { lastTap = Date.now() }, true)
const keepFocus = (e: FocusEvent) => {
  if (e.relatedTarget || Date.now() - lastTap < 600) return
  setTimeout(() => { if (document.visibilityState === 'visible' && !document.activeElement?.closest('a,button,summary,select,textarea')) box.value?.focus({ preventScroll: true }) }, 80)
}
/** SPEC 63 NV-1 (was F2 «показати ще»): results and the full lemma list are paged by `?p=`, never rendered at once */
const pgR = usePage(computed(() => rows.value.length)), pgL = usePage(computed(() => corpus.value?.nLemmas ?? 0), LEMMA_PAGE)
watch(q, () => { if (route.query.p !== undefined) pgR.go(1) })
const viaUk = { lemma: 'лема', form: 'історична форма', paradigm: 'словоформа' } as const
/** the lemma list is paged files (pg/lemmas/<n>.json), one page per request */
const lemmaChips = computed(() => lemmaPage(pgL.page.value) ?? [])
/** Plast vocabulary (SL-2) is searchable too — its words are mostly not corpus lemmas, so they never reached the lemma index */
/** SPEC 63 CV-4: «неперевірена лема» cards of unlinked corpus spellings (prefix-sharded, ≥ 2 letters), shown after the verified results */
const uvHits = ref<UvHit[]>([])
watch(q, async v => { const x = v; const r = await uvSearch(x).catch(() => []); if (x === q.value) uvHits.value = r }, { immediate: true })
const plast = computed(() => (q.value.trim() ? plastSearch(q.value, 10_000) : []))   // first 3 shown here, the rest on /plast
</script>

<template>
  <section class="hero">
    <h1>Звідки слово?</h1>
    <p class="muted">Лексикон словоформ із доказами: перша фіксація, історичні написання, мітки (церковнослов’янське, суржик, діалектне, розмовне) — кожна з джерелом і цитатою.
      <span class="sans small">Where does a Ukrainian word come from — every claim with its evidence.</span></p>
    <input ref="box" v-model="q" type="search" inputmode="search" enterkeyhint="search" @blur="keepFocus" placeholder="Знайти слово: князь, кънѧзь, видѣти, шо…" aria-label="Пошук слова" autofocus autocomplete="off" spellcheck="false" @keydown.enter="go" />
    <p class="small muted sans">Без урахування наголосу й регістру; приймає ѣ ъ ы ѧ. <template v-if="corpus">Корпус: {{ fmtNum(corpus.N) }} слів, {{ fmtNum(corpus.nAttested ?? corpus.nLemmas) }} лем з засвідченнями<template v-if="corpus.nDictOnly"> і ще {{ fmtNum(corpus.nDictOnly) }} лише зі словників (без засвідчень у корпусі)</template>.</template></p>
  </section>

  <section v-if="plast.length" class="card" aria-live="polite">
    <h2><span>Пластова лексика</span> <span class="muted small">{{ plast.length }}</span></h2>
    <ul class="results">
      <li v-for="e in plast.slice(0, 3)" :key="e.src + e.loc">
        <RouterLink :to="wordCardTo(e.w, searchIdx, ixCards)">
          <span class="lem">{{ e.w }}</span>
          <span class="badge">{{ e.k === 'abbr' ? 'абревіатура' : 'пластова лексика' }}</span>
          <span class="small sans">«{{ e.g }}»</span>
          <span class="small muted sans">{{ e.loc }}<template v-if="e.byGloss"> · знайдено в тлумаченні</template></span>
        </RouterLink>
        <span class="small sans"> · <RouterLink :to="`/source/${encodeURIComponent(e.src)}`">джерело</RouterLink></span>
      </li>
    </ul>
    <p v-if="plast.length > 3" class="small sans"><RouterLink :to="{ path: '/plast', query: { q: q.trim() } }">усі {{ plast.length }} пластові збіги →</RouterLink></p>
  </section>
  <section v-if="cardHits.length" class="card" aria-live="polite">
    <h2><span>Інші картки (словники, рідкісні й архаїчні слова)</span> <span class="muted small">{{ cardHits.length }}</span></h2>
    <ul class="results">
      <li v-for="r in cardHits" :key="r.kind + r.id">
        <RouterLink :to="cardRoute(r)">
          <span class="lem">{{ r.id }}</span>
          <span class="badge">{{ r.kind === 'ar' ? 'архаїчна/словникова картка' : 'коротка картка' }}</span>
          <span v-if="r.matched.toLowerCase() !== r.id.toLowerCase()" class="small sans">знайдено: «{{ r.matched }}»</span>
        </RouterLink>
      </li>
    </ul>
  </section>
  <div v-if="!loaded"><div class="skeleton" v-for="i in 4" :key="i" /></div>
  <ul v-else-if="rows.length" class="results" aria-live="polite">
    <li v-for="r in pgR.slice(rows)" :key="r.lemma">
      <RouterLink :to="`/w/${encodeURIComponent(r.lemma)}`">
        <span class="lem">{{ r.lemma }}</span>
        <template v-if="info(r).c"><span class="muted small sans">{{ info(r).c!.pos }}</span></template>
        <span v-if="r.matched !== r.lemma" class="small sans">знайдено: «{{ r.matched }}» ({{ viaUk[r.via] }})</span>
        <template v-if="info(r).c">
          <span v-if="info(r).fa" class="small sans">перша фіксація <strong>{{ fmtDate(info(r).fa!.date) }}</strong> · {{ info(r).who }}</span>
          <span v-else class="unk">перша фіксація невідома</span>
          <Dots :dots="info(r).c!.stats.dots" :ipm="info(r).c!.stats.ipm" :hk="info(r).c!.stats.hk" :f="info(r).c!.stats.f" :N="corpus?.N" />
        </template>
      </RouterLink>
    </li>
    <li v-if="pgR.pages.value > 1" class="pagerli"><Pagination :page="pgR.page.value" :pages="pgR.pages.value" :total="rows.length" @go="pgR.go" /></li>
  </ul>
  <template v-else-if="q.trim() && loaded && !searching && !cardHits.length && !dictRows.length && !uvHits.length">
    <div class="card" role="status">
      <p><strong>«{{ q.trim() }}» — немає в корпусі, аналіз за правилами.</strong> Це не словникова стаття: нижче лише розбір за правилами з джерелами (будова, деривація, шлях запозичення, омографи, русинська, IPA); «невідомо» ≠ «літературне».</p>
      <p class="small sans"><RouterLink :to="{ path: '/analyze', query: { q: q.trim() } }">Відкрити в «Аналізі слова» →</RouterLink></p>
    </div>
    <AnalyzeView :embed="q.trim()" />
  </template>
  <div v-else-if="loaded && !q.trim()" class="card">
    <h2>Усі леми з повною карткою ({{ corpus?.nLemmas }})</h2>
    <div class="chips"><RouterLink v-for="l in lemmaChips" :key="l" class="chip" :to="`/w/${encodeURIComponent(l)}`" style="text-decoration:none">{{ l }}</RouterLink></div>
    <Pagination :page="pgL.page.value" :pages="pgL.pages.value" @go="pgL.go" />
    <p class="small muted sans" style="margin-top:.8rem">Спробуйте <a href="#/annotate">анотатор тексту</a> на прикладах із пам’яток корпусу.</p>
  </div>
  <!-- SPEC 63 DO-4: dictionary-only cards (VESUM / r2u / Plast) — after every corpus-attested result -->
  <section v-if="dictRows.length" class="card" aria-live="polite" data-testid="dict-hits">
    <h2><span>Лише зі словників</span> <span class="muted small">{{ dictRows.length }}</span></h2>
    <ul class="results">
      <li v-for="r in dictRows" :key="r.id">
        <RouterLink :to="cardRoute(r)">
          <span class="lem">{{ r.id }}</span>
          <span class="badge" :title="DICT_STATUS">лише словник</span>
          <span v-if="r.matched.toLowerCase() !== r.id.toLowerCase()" class="small sans">знайдено: «{{ r.matched }}»</span>
        </RouterLink>
      </li>
    </ul>
  </section>
  <!-- SPEC 63 CV-4: unlinked corpus spellings (нѣгдѣ) — «неперевірена лема» cards, listed AFTER every verified card -->
  <section v-if="uvHits.length" class="card" aria-live="polite" data-testid="uv-hits">
    <h2><span>Неперевірені слова з текстів</span> <span class="muted small">{{ uvHits.length }}</span></h2>
    <ul class="results">
      <li v-for="h in uvHits" :key="h.group">
        <RouterLink :to="`/uv/${encodeURIComponent(h.group)}`">
          <span class="lem">{{ h.head }}</span>
          <span class="badge" :title="h.att ? 'Засвідчено кількома вичитаними пам’ятками; у словниках немає' : undefined">{{ h.att ? 'засвідчене слово' : 'неперевірена' }}</span>
          <span v-if="h.matched !== h.head.toLowerCase()" class="small sans">знайдено: «{{ h.matched }}»</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
