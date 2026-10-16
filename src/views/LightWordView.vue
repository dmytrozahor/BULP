<script setup lang="ts">
/**
 * SPEC 63 PV-6 / CV-1 / CV-5 /lw/:lemma — light card: a VESUM lemma that the corpus attests but the full lexicon dropped (KEEP_MIN_F, SPEC 20 B-5a), and/or a word attested in a dictionary
 * witness (headword or quoted equivalent) — each attestation line = dictionary, date, quoted article start, locator. A spelling VESUM does not know is carried as attested.
 * CV-5: ALL VESUM analyses of the attested spelling are listed (риночку = риночок m v_mis / риночка f v_zna); the context rule (на / в / у + locative) only marks the preferred one.
 * The detail blocks are the lexicon card's own components (ThinCard).
 */
import { computed, ref, watch } from 'vue'
import { lightRow } from '../lib/torotData.ts'
import { ixPrefix } from '../lib/parts.ts'
import { loadCv } from '../lib/cardIndex.ts'
import { textTo, witnessTo } from '../lib/nav.ts'
import { dictInfo, type CvEntry } from '../../core/cv.ts'
import type { Kwic } from '../../core/types.ts'
import { key } from '../../core/text.ts'
import { useData } from '../composables/useData.ts'
import PlastSenses from '../components/PlastSenses.vue'
import ThinCard from '../components/ThinCard.vue'
import IkavismChain from '../components/IkavismChain.vue'
import { ikavismBaseRemote } from '../lib/lightcard.ts'
import { findLoc, loadTokens } from '../lib/witnessText.ts'
import { kwicAt } from '../lib/unlinked.ts'
const props = defineProps<{ lemma: string }>()
const cv = ref<CvEntry>(), err = ref(''), cvDone = ref(false), kwic = ref<Kwic[]>([])
const { annData, loaded, witnessById, byLemma } = useData()
watch(() => props.lemma, () => {
  cvDone.value = false; cv.value = undefined
  loadCv(props.lemma).then(e => (cv.value = e)).catch(e => (err.value = String(e))).finally(() => (cvDone.value = true))
}, { immediate: true })
const found = computed(() => lightRow(props.lemma))   // PF-1: the card's bucket shard (tc/light), not light.json
const row = computed(() => found.value.value)
const done = computed(() => cvDone.value && found.value.ready)
const word = computed(() => row.value?.[0] ?? cv.value?.[0] ?? props.lemma)
const tags = computed(() => row.value?.[1] ?? cv.value?.[1] ?? '')
/** GZ-4: the stem relative that proves the о/е > і alternation (покірність ~ покора) */
const base = ref<string[]>([])
watch(row, async r => { base.value = r ? await ikavismBaseRemote(r[0], async pre => (await ixPrefix(pre)).map(e => e[0]).sort()) : [] }, { immediate: true })
const ex = computed(() => { const [w, loc, raw] = (row.value?.[3] ?? '').split('|'); return w ? { w, loc: loc ?? '', raw: raw ?? '' } : undefined })
let kwicSeq = 0
watch([done, cv, row], async () => {
  const n = ++kwicSeq
  if (!done.value) { kwic.value = []; return }
  const srcs = [ex.value, ...(cv.value?.[3] ?? []).slice(0, 2).map(a => ({ w: a[0], loc: a[1], raw: a[2] }))].filter((x): x is { w: string; loc: string; raw: string } => !!x)
  const out: Kwic[] = []
  for (const s of srcs) {
    const toks = await loadTokens(s.w).catch(() => null); if (!toks) continue
    const i = findLoc(toks, s.loc), k = i >= 0 ? kwicAt(toks, i, s.w) : undefined
    if (k) out.push({ ...k, date: witnessById.value.get(s.w)?.date ?? [0, 0] })
  }
  if (n === kwicSeq) kwic.value = out
}, { immediate: true })
const wt = (id: string) => witnessById.value.get(id)?.title ?? id
const wd = (id: string) => { const d = witnessById.value.get(id)?.date; return d ? (d[0] === d[1] ? String(d[0]) : `${d[0]}–${d[1]}`) : '' }
const spelling = computed(() => ex.value?.raw || cv.value?.[3][0]?.[2] || word.value)
/** CV-5: all VESUM analyses of the spelling; the card of each is one tap away (full card if the lexicon has the lemma, else /lw) */
const analyses = computed(() => (cv.value?.[4]?.an ?? []).map(([lemma, t]) => ({ lemma, tags: t, to: byLemma.value.has(lemma) ? `/w/${encodeURIComponent(lemma)}` : `/lw/${encodeURIComponent(lemma)}`, self: key(lemma) === key(word.value), picked: cv.value?.[4]?.pick === lemma })))
const prev = computed(() => cv.value?.[4]?.prev)
/** SPEC 63 DO-2: a dictionary-only card (VESUM / r2u / Plast, no corpus text): explicit status, sources by name, f = 0, no «найраніше» */
const dict = computed(() => (row.value ? undefined : dictInfo(cv.value)))
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← тексти</RouterLink></p>
  <p v-if="err" class="muted sans">{{ err }}</p>
  <div v-else-if="!done" class="skeleton" style="height:4rem" />
  <p v-else-if="!row && !cv" class="muted sans">Легкої картки «{{ lemma }}» немає.</p>
  <template v-else>
    <h1>{{ word }} <small class="muted sans">коротка картка</small></h1>
    <p v-if="dict" class="sans small" data-testid="dict-only">
      <span class="badge">{{ dict.status }}</span>
      Джерела: <b>{{ dict.sources.join(' · ') }}</b>. Вжив. у корпусі: f = {{ dict.f }}. Найраніше: — <span class="muted">(роки словників нижче — дати словників, а не перша фіксація слова)</span>
    </p>
    <p v-if="tags" class="sans small">VESUM: <code>{{ tags }}</code><template v-if="row"> · вжив. у корпусі: {{ row[2] }}</template></p>
    <p v-else class="sans small"><b>Написання як засвідчене:</b> ВЕСУМ такої форми не підтверджує, лематизацію не вгадано; картка подає лише рядки словників.</p>
    <section v-if="analyses.length > 1" class="card sans small" aria-label="Аналізи ВЕСУМ" data-testid="vesum-analyses">
      <strong>Усі аналізи написання «{{ spelling }}» у ВЕСУМ</strong>
      <ul>
        <li v-for="a in analyses" :key="a.lemma + a.tags">
          <RouterLink v-if="!a.self" :to="a.to" class="lang">{{ a.lemma }}</RouterLink><b v-else>{{ a.lemma }}</b> <code>{{ a.tags }}</code>
          <span v-if="a.picked" class="badge" title="правило контексту користувача: попередній прийменник на / в / у / по / при + місцевий відмінок">за контекстом<template v-if="prev"> «{{ prev }}»</template></span>
        </li>
      </ul>
      <p class="muted">Жодного аналізу не відкинуто: контекст лише позначає ймовірніший, коли його вирішує просте правило (прийменник + місцевий відмінок).</p>
    </section>
    <p v-if="row" class="sans small muted">Мало засвідчена в нашому корпусі (f = {{ row[2] }}): повної картки немає, бо лема трапляється рідше за поріг лексикону (KEEP_MIN_F). Це не рідкісне слово мови: VESUM її знає.</p>
    <p v-else-if="dict" class="sans small muted">Слово є у словнику, але жоден текст нашого корпусу його не засвідчує, тому частот, першої фіксації й прикладів немає — нічого не вигадано. Правила, виведення з написання й довідкові блоки нижче працюють без корпусу.</p>
    <p v-else-if="cv && cv[2] === 0" class="sans small muted">Слово засвідчене у пластових словниках (значення нижче); у корпусі текстів і в історичних словниках не трапляється.</p>
    <p v-else class="sans small muted">Слово засвідчене лише в словниках (заголовне слово або цитований відповідник); у корпусі текстів не трапляється, тому повної картки з частотами немає.</p>
    <PlastSenses :word="word" />
    <IkavismChain v-if="row && base.length" :lemma="row[0]" :paradigm="base" />
    <p v-if="ex" class="sans small">Приклад: <RouterLink :to="textTo(ex.w, ex.loc)">«{{ ex.raw }}»</RouterLink> · {{ ex.loc }} · <RouterLink :to="witnessTo(ex.w)">{{ ex.w }}</RouterLink></p>
    <template v-if="cv && cv[3].length">
      <h2>{{ dict ? 'Словникові джерела' : 'Засвідчення' }} <small class="muted sans">{{ cv[2] }}</small></h2>
      <ul class="sans small">
        <li v-for="(a, i) in cv[3]" :key="i"><b>{{ a[2] }}</b> · <RouterLink :to="witnessTo(a[0])">{{ wt(a[0]) }}</RouterLink><template v-if="wd(a[0])">, {{ dict ? 'рік словника ' : '' }}{{ wd(a[0]) }}</template> · <RouterLink :to="textTo(a[0], a[1])">{{ a[1] }}</RouterLink></li>
      </ul>
      <p v-if="cv[2] > cv[3].length" class="sans small muted">Показано {{ cv[3].length }} з {{ cv[2] }} засвідчень.</p>
    </template>
    <ThinCard :lemma="word" :spelling="spelling" :kwic="kwic" :dict-only="!!dict" />
  </template>
</template>
