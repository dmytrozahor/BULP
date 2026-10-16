<script setup lang="ts">
/**
 * SPEC 63 CV-4 /uv/:id — card of an «неперевірена лема»: unlinked corpus spellings grouped by the spelling-fold key (нѣгдѣ ~ негде). No dictionary lists the word and VESUM does not know it, so
 * nothing here is a lemma claim: the spellings, KWIC, witnesses (date, epoch) and an ORV card come from the corpus; rule candidates are hypotheses, shown as such.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { uvOccurrences, type UvGroup } from '../../core/uv.ts'
import { useData } from '../composables/useData.ts'
import { deriveWithSteps } from '../lib/derive.ts'
import { analyzeLink } from '../lib/analyze-links.ts'
import { epochShort, fmtDate, fmtNum } from '../lib/format.ts'
import { formTo, textTo, witnessTo } from '../lib/nav.ts'
import { loadUvGroup } from '../lib/uvData.ts'
import { occurrenceKwic, type UnlinkedKwic } from '../lib/unlinked.ts'
import { ixCards } from '../lib/parts.ts'
import UserHypotheses from '../components/UserHypotheses.vue'
import ThinCard from '../components/ThinCard.vue'
import { cognatesOf } from '../lib/cognatesData.ts'
const props = defineProps<{ id: string }>()
const { byLemma, searchIdx, witnessById } = useData()
const g = ref<UvGroup>(), state = ref<'loading' | 'done'>('loading'), lines = ref<UnlinkedKwic[]>([])
watch(() => props.id, async id => {
  state.value = 'loading'; g.value = undefined; lines.value = []
  const x = await loadUvGroup(id); if (id !== props.id) return
  g.value = x; state.value = 'done'
  if (x) { const ks = await Promise.all(uvOccurrences(x).map(o => occurrenceKwic(o))); if (id === props.id) lines.value = ks.filter((k): k is UnlinkedKwic => !!k) }
}, { immediate: true })
const epochsOf = (id: string): string[] => { const e = wit(id)?.epochShev; return e && isKnown(e) ? e.value.epochs.map(epochShort) : [] }
const kwicFull = computed(() => lines.value.map(k => ({ ...k, date: wit(k.w)?.date ?? [0, 0] as [number, number] })))
const occs = computed(() => (g.value ? uvOccurrences(g.value) : []))
const wit = (id: string) => witnessById.value.get(id)
const ctx = computed(() => ({ lemmas: byLemma.value, hits: searchIdx.value.map, cards: ixCards }))
/** rule candidates of the headword and of every other spelling (hypotheses; «є в словнику» only when a card stands behind the form) */
const cands = computed(() => {
  if (!g.value) return []
  const seen = new Set<string>(), out: { form: string; steps: number; link: ReturnType<typeof analyzeLink>; via: string }[] = []
  for (const [raw] of g.value[3].slice(0, 4)) for (const c of deriveWithSteps(raw).candidates) {
    if (c.form === raw || seen.has(c.form)) continue
    seen.add(c.form); out.push({ form: c.form, steps: c.steps.length, link: analyzeLink(c.form, ctx.value), via: raw })
  }
  return out.slice(0, 12)
})
const ocr = computed(() => occs.value.some(o => /\bOCR\b/i.test(wit(o.w)?.title ?? '')))
const epochs = computed(() => [...new Set(occs.value.flatMap(o => { const e = wit(o.w)?.epochShev; return e && isKnown(e) ? e.value.epochs.map(epochShort) : [] }))])
/** BL-15: the Proto-Slavic pivot of a candidate that is a lexicon lemma */
const cog = ref<{ lemma: string; pivot: string }[]>([])
watch(cands, async cs => {
  const out: { lemma: string; pivot: string }[] = []
  for (const c of cs.filter(c => c.link.kind === 'word' && c.link.to.startsWith('/w/')).slice(0, 4)) { const lemma = decodeURIComponent(c.link.to.slice(3)), { entry } = await cognatesOf(lemma); if (entry) out.push({ lemma, pivot: entry.pivot }) }
  cog.value = out
}, { immediate: true })
</script>

<template>
  <div v-if="state === 'loading'" class="skeleton" style="height:4rem" />
  <p v-else-if="!g" class="muted sans">Картки неперевіреної леми «{{ id }}» немає.</p>
  <template v-else>
    <header class="wordhead headline compact">
      <h1 class="lemma">{{ g[0] }}</h1>
      <p class="hl-line sans">
        <span class="derived-badge" title="Жоден словник не містить слова, ВЕСУМ його не знає: це група написань із текстів, не підтверджена лема">неперевірена лема</span>
        <span class="muted"> зустрічається </span>{{ fmtNum(g[1]) }}<span class="muted"> разів у </span>{{ fmtNum(g[2]) }}<span class="muted"> пам’ятках</span>
        <template v-if="epochs.length"><span class="muted"> · епохи: </span>{{ epochs.join(', ') }}</template>
      </p>
    </header>
    <section class="card sans small" aria-label="Написання">
      <strong>Написання в тексті</strong> <span class="muted">(згруповані за ключем згортання: ѣ=е, ы=и, оу=у, ъ/ь опущені; ключ «{{ id }}»)</span>
      <p><RouterLink v-for="[raw, n] in g[3]" :key="raw" :to="formTo(raw)" class="chip" style="text-decoration:none">{{ raw }} ×{{ fmtNum(n) }}</RouterLink></p>
      <p class="muted">Це не словникова стаття і не підтверджена лема: леми, значення й частини мови немає в жодному джерелі.</p>
      <p v-if="ocr" class="muted">Серед пам’яток є OCR-скан: розпізнавання могло спотворити слово.</p>
    </section>
    <p class="sans small muted">Вживання: показано {{ lines.length }} із {{ fmtNum(g[1]) }} (рядки нижче, у блоці «Приклади · KWIC»).</p>
    <section class="card sans small" aria-label="Пам’ятки">
      <strong>Пам’ятки</strong>
      <ul><li v-for="o in occs" :key="o.w"><RouterLink :to="witnessTo(o.w)">{{ wit(o.w)?.title ?? o.w }}</RouterLink><template v-if="wit(o.w)"> · {{ fmtDate(wit(o.w)!.date) }}</template>
        <template v-if="epochsOf(o.w).length"> · {{ epochsOf(o.w).join(' / ') }}</template></li></ul>
      <p v-if="g[2] > occs.length" class="muted">і ще {{ g[2] - occs.length }} пам’яток</p>
    </section>
    <section v-if="g[4]" class="card sans small" aria-label="ORV">
      <strong>Давньоруська лема (TOROT)</strong>: <RouterLink :to="`/orv/${encodeURIComponent(g[4])}`">{{ g[4] }}</RouterLink>
    </section>
    <UserHypotheses :spellings="g[3].map(s => s[0])" />
    <section class="card sans small" aria-label="Кандидати">
      <strong>Кандидати за правилами</strong> <span class="muted">(гіпотези; зв’язком стають лише після збігу з формою ВЕСУМ)</span>
      <ul v-if="cands.length"><li v-for="c in cands" :key="c.form"><RouterLink :to="c.link.to" class="lang">{{ c.form }}</RouterLink>
        <span class="muted"> ← {{ c.via }} · {{ c.link.kind === 'word' ? 'є в словнику' : 'реконструкція (гіпотеза)' }}, кроків: {{ c.steps }}</span></li></ul>
      <p v-else class="muted">Правила не дають іншого кандидата.</p>
      <ul v-if="cog.length"><li v-for="c in cog" :key="c.lemma">Спільнокореневе: <RouterLink :to="`/w/${encodeURIComponent(c.lemma)}`">{{ c.lemma }}</RouterLink> ← {{ c.pivot }} (BL-15)</li></ul>
      <RouterLink :to="{ path: '/analyze', query: { q: g[0] } }">повний аналіз за правилами →</RouterLink>
    </section>
    <ThinCard :spelling="g[0]" :kwic="kwicFull" />
  </template>
</template>
