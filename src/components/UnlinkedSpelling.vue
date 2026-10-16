<script setup lang="ts">
/**
 * SPEC 63 NV-3 «незв’язане написання»: /f/:form for a spelling that no lexicon lemma owns. Shows where it occurs (index core/unlinked.ts → KWIC cut from the text shard),
 * the witnesses with dates, the analyser's candidates and the reason it is unlinked. A spelling in a lemma's PARADIGM (VESUM) says so and links the lemma.
 * Only a spelling found in no text and no paradigm gets the plain «не знайдено» — never the dead-end wording for a spelling that occurs in a text.
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { key } from '../../core/text.ts'
import { occurrencesOf, type UnlinkedEntry } from '../../core/unlinked.ts'
import { useData } from '../composables/useData.ts'
import { deriveWithSteps } from '../lib/derive.ts'
import { runDetectors } from '../lib/analyze.ts'
import { analyzeLink } from '../lib/analyze-links.ts'
import { fmtDate, fmtNum } from '../lib/format.ts'
import { formTo, textTo, witnessTo, wordTo } from '../lib/nav.ts'
import { lookupUnlinked, occurrenceKwic, type UnlinkedKwic } from '../lib/unlinked.ts'
import { uvOfSpelling } from '../lib/uvData.ts'
import UserHypotheses from './UserHypotheses.vue'
import WitnessPanel from './WitnessPanel.vue'
import { ixCards } from '../lib/parts.ts'
const props = defineProps<{ form: string; /** inside a page that already has its own header: render nothing when the spelling is in no text */ quiet?: boolean }>()
const { byLemma, searchIdx, annData, witnessById } = useData()
const entry = ref<UnlinkedEntry>(), state = ref<'loading' | 'done'>('loading'), lines = ref<UnlinkedKwic[]>([])
const uvCard = ref<{ group: string; head: string }>()   // SPEC 63 CV-4: the «неперевірена лема» card this spelling belongs to
watch(() => props.form, f => { uvCard.value = undefined; uvOfSpelling(f).then(c => { if (f === props.form) uvCard.value = c }, () => undefined) }, { immediate: true })
watch(() => props.form, async f => {
  state.value = 'loading'; entry.value = undefined; lines.value = []
  const e = await lookupUnlinked(f); if (f !== props.form) return
  entry.value = e; state.value = 'done'
  if (e) { const ks = await Promise.all(occurrencesOf(e).map(o => occurrenceKwic(o))); if (f === props.form) lines.value = ks.filter((k): k is UnlinkedKwic => !!k) }
}, { immediate: true })
const occs = computed(() => (entry.value ? occurrencesOf(entry.value) : []))
const para = computed(() => searchIdx.value.map.get(key(props.form)) ?? [])
const d = computed(() => deriveWithSteps(props.form))
const an = computed(() => runDetectors(props.form, annData.value))
const ctx = computed(() => ({ lemmas: byLemma.value, hits: searchIdx.value.map, cards: ixCards }))
const cands = computed(() => d.value.candidates.filter(c => c.form !== props.form).map(c => ({ form: c.form, steps: c.steps.length, link: analyzeLink(c.form, ctx.value) })))
const wit = (id: string) => witnessById.value.get(id)
const ocr = computed(() => occs.value.some(o => /\bOCR\b/i.test(wit(o.w)?.title ?? '')))
/** the reason, from facts only: VESUM / index lookups and the rule candidates; OCR is named when a witness is an OCR text */
const reason = computed(() => {
  const r: string[] = []
  if (an.value.vesum.length) r.push(`ВЕСУМ знає це написання (лема ${[...new Set(an.value.vesum.map(h => h.lemma))].slice(0, 3).join(', ')}), але такої леми немає в словнику сайту`)
  else r.push('цього написання немає у ВЕСУМ і в LanguageTool-індексі')
  if (!cands.value.length) r.push('правила виведення не дають іншого кандидата')
  else if (!cands.value.some(c => c.link.kind === 'word')) r.push('правила дають лише гіпотетичні кандидати, яких теж немає в словнику')
  if (ocr.value) r.push('пам’ятка — OCR-скан: розпізнавання могло спотворити слово')
  return r
})
</script>

<template>
  <div v-if="state === 'loading'" class="skeleton" style="height:4rem" />
  <template v-else-if="entry || para.length">
    <header v-if="!quiet" class="wordhead headline compact">
      <h1 class="lemma">{{ entry?.[0] ?? form }}</h1>
      <p class="hl-line sans">
        <span class="derived-badge">{{ entry ? 'незв’язане написання' : 'словоформа парадигми' }}</span>
        <template v-if="entry"> <span class="muted">зустрічається </span>{{ fmtNum(+entry[1]) }}<span class="muted"> разів у </span>{{ fmtNum(+entry[2]) }}<span class="muted"> пам’ятках</span></template>
      </p>
    </header>
    <section v-if="para.length" class="card sans small" aria-label="Парадигма">
      Це словоформа <template v-for="(h, i) in para" :key="h.lemma"><template v-if="i">, </template>леми <RouterLink :to="wordTo(h.lemma)">{{ h.lemma }}</RouterLink> (<RouterLink :to="formTo(h.form, h.lemma)">{{ h.via === 'paradigm' ? 'ВЕСУМ' : 'словник' }}</RouterLink>)</template>;
      <span v-if="!entry" class="muted"> у текстах корпусу не засвідчена.</span>
    </section>
    <template v-if="entry">
      <section v-if="uvCard" class="card sans small" aria-label="Неперевірена лема">
        <strong>Картка неперевіреної леми:</strong> <RouterLink :to="`/uv/${encodeURIComponent(uvCard.group)}`">{{ uvCard.head }}</RouterLink> <span class="muted">(усі варіанти написання разом)</span>
      </section>
      <section class="card sans small" aria-label="Чому не зв’язано">
        <strong>Чому не зв’язано з лемою</strong>
        <ul><li v-for="r in reason" :key="r">{{ r }}</li></ul>
      </section>
      <section class="card" aria-label="Вживання">
        <h2><span>Вживання</span><span class="small">показано {{ lines.length }} із {{ fmtNum(+entry[1]) }}</span></h2>
        <div v-for="(k, i) in lines" :key="i" class="kwic">
          <span class="l"><span>{{ k.left }}</span></span>{{ ' ' }}<span class="n">{{ k.node }}</span>{{ ' ' }}<span class="r">{{ k.right }}</span>
          <span class="cite sans small"><RouterLink :to="textTo(k.w, k.loc)">{{ k.loc }}</RouterLink> · <RouterLink :to="witnessTo(k.w)">картка пам’ятки</RouterLink></span>
        </div>
      </section>
      <section class="card sans small" aria-label="Пам’ятки">
        <strong>Пам’ятки</strong>
        <WitnessPanel :items="occs.map(o => ({ w: o.w, n: 1 }))" />
        <p v-if="+entry[2] > occs.length" class="muted">і ще {{ +entry[2] - occs.length }} пам’яток</p>
      </section>
    </template>
    <UserHypotheses :spellings="[form]" />
    <section class="card sans small" aria-label="Кандидати">
      <strong>Кандидати за правилами</strong> <span class="muted">(гіпотези; зв’язком стають лише після збігу з формою ВЕСУМ)</span>
      <ul v-if="cands.length"><li v-for="c in cands" :key="c.form"><RouterLink :to="c.link.to" class="lang">{{ c.form }}</RouterLink>
        <span class="muted"> · {{ c.link.kind === 'word' ? 'є в словнику' : 'реконструкція' }}, кроків: {{ c.steps }}</span></li></ul>
      <p v-else class="muted">Правила не дають іншого кандидата.</p>
      <RouterLink :to="{ path: '/analyze', query: { q: form } }">повний аналіз за правилами →</RouterLink>
    </section>
  </template>
  <div v-else-if="!quiet" class="card" role="status">
    <h1>«{{ form }}»</h1>
    <p class="sans">Цього написання не знайдено ні в текстах корпусу, ні в парадигмах словника.</p>
    <p class="sans"><RouterLink :to="{ path: '/', query: { q: form } }">шукати «{{ form }}» →</RouterLink> · <RouterLink :to="{ path: '/analyze', query: { q: form } }">аналіз за правилами →</RouterLink></p>
  </div>
</template>
