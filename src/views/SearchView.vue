<script setup lang="ts">
/**
 * Instant search over lemmas AND every historical spelling / paradigm form (stress- and case-insensitive via core/text.ts key();
 * Old letters ѣ ъ ы ѧ accepted). Results: lemma, first-attestation year + author, dots barometer. Unknown → /analyze.
 */
import { corrOf } from '../lib/corrData.ts'
import { variantFormHits, variantTo } from '../../core/subcard.ts'
import { DIALECTS } from '../../core/rules.ts'
import FirstChip from '../components/FirstChip.vue'
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
import EntryCounts from '../components/EntryCounts.vue'
import AnalyzeView from './AnalyzeView.vue'   // UX-7: rule-based fallback for words outside the lexicon
import { buildHypothesis, hypTo, type Hypothesis } from '../lib/hypothesis.ts'
import { HYP_BADGE } from '../../core/hypothesis.ts'
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
/** SPEC 63 DB-3b: a query that is a DIALECT FORM of a correspondence group (CR-1) offers the variant's own card, below the real lemmas; the lm/cg shard is read lazily, after the query has settled (350 ms), never on the keystroke path */
const settledQ = ref('')
watch(q, v => { const t = v.trim(), n = ++vseq; settledQ.value = ''; if ([...t].length < 3 || /s/.test(t)) return; setTimeout(() => { if (n === vseq) settledQ.value = t }, 350) }, { immediate: true })
let vseq = 0
const crHits = computed(() => (settledQ.value ? variantFormHits(settledQ.value, corrOf(settledQ.value) ?? []) : []))
/** SPEC 63 DB-3c: a typed dialect form no real page answers (not in the lexicon) is folded back by the reverse folds (core/variant-search.ts, lazy chunk) and confirmed against the lemma index; «виведено за правилами» */
const ruleMod = shallowRef<typeof import('../../core/variant-search.ts')>()
watch(settledQ, async v => { if (v && !ruleMod.value) ruleMod.value = await import('../../core/variant-search.ts') }, { immediate: true })
const ruleHits = computed(() => (settledQ.value && ruleMod.value && !rows.value.length && !searching.value ? ruleMod.value.ruleVariantHits(settledQ.value, k => searchIdx.value.map.get(k) ?? []).filter(r => !crHits.value.some(c => c.code === r.code && c.of === r.of)) : []))
const variantHits = computed(() => [...crHits.value.map(c => ({ ...c, rule: '' })), ...ruleHits.value.map(r => ({ ...r, grade: 'rule' as const }))])
/** CP-11: a hypothetical form (original / derived, no source attests it) is the LAST tier, after Plast terms; debounced so a keystroke costs nothing extra while typing, and only for a query that no real page answers */
const hypHit = shallowRef<Hypothesis>(), hseq = ref(0)
watch(q, async v => {
  const t = v.trim(), n = ++hseq.value; hypHit.value = undefined
  if ([...t].length < 4) return
  await new Promise(r => setTimeout(r, 350))
  if (n !== hseq.value) return
  const h = await buildHypothesis(t).catch(() => undefined)
  if (n === hseq.value) hypHit.value = h
}, { immediate: true })
</script>

<template>
  <section class="hero">
    <h1>Звідки слово?</h1>
    <p class="muted">Лексикон словоформ із доказами: перша фіксація, історичні написання, мітки (церковнослов’янське, суржик, діалектне, розмовне) — кожна з джерелом і цитатою.
      <span class="sans small">Where does a Ukrainian word come from — every claim with its evidence.</span></p>
    <input ref="box" v-model="q" type="search" inputmode="search" enterkeyhint="search" @blur="keepFocus" placeholder="Знайти слово: князь, кънѧзь, видѣти, шо…" aria-label="Пошук слова" autofocus autocomplete="off" spellcheck="false" @keydown.enter="go" />
    <p class="small muted sans">Без урахування наголосу й регістру; приймає ѣ ъ ы ѧ. <template v-if="corpus">Корпус: {{ fmtNum(corpus.N) }} слів, {{ fmtNum(corpus.nAttested ?? corpus.nLemmas) }} лем з засвідченнями<template v-if="corpus.nDictOnly"> і ще {{ fmtNum(corpus.nDictOnly) }} лише зі словників (без засвідчень у корпусі)</template>.</template></p>
    <p v-if="corpus?.nEntries" class="small muted sans" data-test="entry-counts">Усього {{ fmtNum(corpus.nEntries) }} статей: <EntryCounts :corpus="corpus" /></p>
  </section>

  <div v-if="!loaded"><div class="skeleton" v-for="i in 4" :key="i" /></div>
  <ul v-else-if="rows.length" class="results" aria-live="polite">
    <li v-for="r in pgR.slice(rows)" :key="r.lemma">
      <RouterLink :to="`/w/${encodeURIComponent(r.lemma)}`">
        <span class="lem">{{ r.lemma }}</span>
        <FirstChip :lemma="r.lemma" />   <!-- SPEC 63 DB-2: the main chip, loaded lazily after the row renders -->
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
  <!-- CP-11d: «інші картки» are the SECOND tier: directly after the main results (exact and prefix lemma matches), never above or between them -->
  <section v-if="cardHits.length" class="card" aria-live="polite" data-testid="card-hits">
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
  <!-- CP-11b: Plast terms are the tier AFTER every other match (regular words, other cards, dictionary-only, unverified), then hypothetical forms (CP-11) -->
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
  <section v-if="variantHits.length" class="card" aria-live="polite" data-testid="variant-hits">
    <h2><span>Варіанти за говорами</span></h2>
    <ul class="results">
      <li v-for="v in variantHits" :key="v.code + v.form + v.of"><RouterLink :to="variantTo(v.code, v.form, v.of)"><span class="lem">{{ v.form }}</span><span class="badge dialect">{{ DIALECTS[v.code] }}</span>
        <span class="small sans">варіант леми «{{ v.of }}» · {{ v.grade === 'dict' ? 'за словником' : v.grade === 'rule' ? 'виведено за правилами (' + v.rule + ')' : 'за свідченням носія' }}</span></RouterLink></li>
    </ul>
  </section>
  <section v-if="hypHit" class="card" aria-live="polite" data-testid="hyp-hits">
    <h2><span>Гіпотетичні форми</span></h2>
    <ul class="results">
      <li><RouterLink :to="hypTo(hypHit.word)"><span class="lem">{{ hypHit.word }}</span><span class="badge" data-testid="hyp-badge">{{ HYP_BADGE }}</span>
        <span class="small sans">виведено з «{{ hypHit.relations[0]?.form }}» ({{ hypHit.rules[0]?.pattern }})</span></RouterLink></li>
    </ul>
  </section>
</template>
