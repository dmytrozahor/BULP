<script setup lang="ts">
/**
 * /derive?from=&dir=old2new|new2old[&to=] — SPEC 30 D-4.3. Old → modern: derive() candidates (VESUM/lexicon form = attested-modern, else suggested, D-1.2).
 * Modern → old: reverse() reconstructions (hypotheses, P-1.7), the lemma's VESUM paradigm is the evidence for ikavism and fleeting vowels.
 * With `to`: explain() the shortest rule path (D-3.1); principles() lists the rules that could apply (D-3.2).
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { explain, principles } from '../../core/reverse.ts'
import { key } from '../../core/text.ts'
import { useData } from '../composables/useData.ts'
import { deriveWithSteps, paradigmOf, reconstruct } from '../lib/derive.ts'
import DerivationSteps from '../components/DerivationSteps.vue'
import EvidenceList from '../components/EvidenceList.vue'
import EvidencePopover from '../components/EvidencePopover.vue'
import FormBadge from '../components/FormBadge.vue'
import FormLegend from '../components/FormLegend.vue'
type Dir = 'old2new' | 'new2old'
const route = useRoute(), router = useRouter()
const { att, loaded, searchIdx, byLemma, fullOf } = useData()
const q = ref(String(route.query.from ?? '')), to = ref(String(route.query.to ?? '')), dir = ref<Dir>(route.query.dir === 'new2old' ? 'new2old' : 'old2new')
watch(() => route.query, v => { q.value = String(v.from ?? ''); to.value = String(v.to ?? ''); dir.value = v.dir === 'new2old' ? 'new2old' : 'old2new' })
const word = computed(() => String(route.query.from ?? '').trim()), target = computed(() => String(route.query.to ?? '').trim())
const submit = () => router.replace({ query: q.value.trim() ? { from: q.value.trim(), dir: dir.value, ...(to.value.trim() && dir.value === 'old2new' ? { to: to.value.trim() } : {}) } : {} })
const flip = (d: Dir) => { dir.value = d; if (q.value.trim()) submit() }

const par = computed(() => (word.value && dir.value === 'new2old' && loaded.value ? paradigmOf(word.value, searchIdx.value, byLemma.value) : { forms: [] as string[] }))
const fwd = computed(() => (word.value && dir.value === 'old2new'
  ? deriveWithSteps(word.value).candidates.map(c => ({ ...c, lemma: searchIdx.value.map.get(key(c.form))?.[0]?.lemma })) : []))
const back = computed(() => (word.value && dir.value === 'new2old' && loaded.value ? reconstruct(word.value, searchIdx.value, byLemma.value, att.value).candidates : []))
/** The attestation line of a confirmed candidate: the first KWIC of that spelling, from the lemma's detail shard (SPEC 20 B-5; core keeps no KWIC). loading = shard not there yet. */
const attLine = (form: string) => {
  const lem = att.value.get(form)?.lemma, card = lem ? fullOf(byLemma.value.get(lem)) : undefined, k = key(form)
  return { loading: !!lem && !card, kwic: card?.forms.find(f => key(f.norm) === k || key(f.raw) === k)?.kwic[0] }
}
const why = computed(() => (word.value && dir.value === 'new2old' ? principles(word.value, par.value.forms) : []))
const path = computed(() => (word.value && target.value && dir.value === 'old2new' ? explain(word.value, target.value) : undefined))
</script>

<template>
  <h1>Деривація: давня ↔ сучасна форма</h1>
  <p class="muted">Виведення за правилами історичної фонетики (Шевельов): від давнього написання до сучасного — і навпаки (наприклад, ікавізм: кінь ← конь). Кожен крок має цитату; реконструкція — гіпотеза, а не факт.</p>
  <form class="row" @submit.prevent="submit">
    <input v-model="q" type="search" :placeholder="dir === 'old2new' ? 'напр. кънѧзь, вѣра, ходилъ' : 'напр. кінь, піч, віра, ходив'" aria-label="Слово" style="flex:1 1 14rem" spellcheck="false" />
    <div class="seg" role="group" aria-label="Напрям">
      <button type="button" class="chip" :aria-pressed="dir === 'old2new'" @click="flip('old2new')">давня → сучасна</button>
      <button type="button" class="chip" :aria-pressed="dir === 'new2old'" @click="flip('new2old')">сучасна → давня</button>
    </div>
    <input v-if="dir === 'old2new'" v-model="to" type="search" placeholder="сучасна форма (необов’язково)" aria-label="Сучасна форма для пояснення шляху" style="flex:1 1 10rem" spellcheck="false" />
    <button class="btn" type="submit">Вивести</button>
  </form>
  <FormLegend />

  <div v-if="!word" class="card muted">Введіть слово. Приклади: <RouterLink :to="{ path: '/derive', query: { from: 'кінь', dir: 'new2old' } }">кінь</RouterLink> ·
    <RouterLink :to="{ path: '/derive', query: { from: 'піч', dir: 'new2old' } }">піч</RouterLink> ·
    <RouterLink :to="{ path: '/derive', query: { from: 'вѣра', dir: 'old2new' } }">вѣра</RouterLink> ·
    <RouterLink :to="{ path: '/derive', query: { from: 'ходилъ', dir: 'old2new', to: 'ходив' } }">ходилъ → ходив</RouterLink></div>

  <template v-else-if="dir === 'old2new'">
    <section v-if="target" class="card"><h2><span>Шлях «{{ word }}» → «{{ target }}»</span></h2>
      <template v-if="path"><DerivationSteps :steps="path.steps" :uid="word + target" />
        <p class="small muted">Найкоротший шлях за правилами: {{ path.steps.length }} кр., гілок з лексичними винятками: {{ path.branches }}.</p></template>
      <p v-else class="unk" tabindex="0">невідомо: жодна послідовність правил не виводить «{{ target }}» з «{{ word }}» (правил не вигадуємо)</p></section>
    <section class="card"><h2><span>Кандидати сучасної форми</span></h2>
      <ul style="list-style:none;padding:0;margin:0">
        <li v-for="c in fwd" :key="c.form" style="margin:.6rem 0">
          <FormBadge v-if="c.lemma" kind="attested" :form="c.form" label="є в словнику" />
          <FormBadge v-else kind="derived" :form="c.form" label="пропозиція (гіпотеза)" />
          <RouterLink v-if="c.lemma" :to="`/w/${encodeURIComponent(c.lemma)}`" class="small sans"> → картка «{{ c.lemma }}»</RouterLink>
          <span v-if="c.branches" class="muted small sans"> · гілок з винятками: {{ c.branches }}</span>
          <DerivationSteps :steps="c.steps" :uid="c.form" />
        </li>
        <li v-if="!fwd.length" class="muted">Кандидатів немає.</li>
      </ul></section>
  </template>

  <template v-else>
    <p v-if="!loaded" class="muted">Завантаження словника…</p>
    <template v-else>
      <section class="card"><h2><span>Реконструкції давніх форм</span><span class="small">метод: реконструкція · кругова перевірка derive()</span></h2>
        <p v-if="!par.forms.length" class="small muted sans">Слова немає в словнику, парадигми немає: чергування о/е ~ і та рухомі голосні не відновлюються без доказу (P-3.1).</p>
        <p v-else class="small muted sans">Парадигма «{{ par.lemma }}» (ВЕСУМ): {{ par.forms.slice(0, 8).join(', ') }}{{ par.forms.length > 8 ? '…' : '' }}</p>
        <ul style="list-style:none;padding:0;margin:0">
          <li v-for="c in back" :key="c.form" style="margin:.6rem 0">
            <FormBadge :kind="c.status === 'confirmed-by-attestation' ? 'confirmed' : 'derived'" :form="c.form" :lemma="att.get(c.form)?.lemma" />
            <span class="muted small sans"> · гілок: {{ c.branches }}</span>
            <EvidencePopover :evidence="c.evidence" heading="Докази реконструкції" :label="c.form"><span class="badge">ⓘ докази</span></EvidencePopover>
            <template v-if="c.attestation">
              <p v-if="attLine(c.form).kwic" class="small sans" style="margin:.2rem 0">Пам’ятка: <i>{{ attLine(c.form).kwic!.left }} <mark>{{ attLine(c.form).kwic!.node }}</mark> {{ attLine(c.form).kwic!.right }}</i>
                <span class="muted"> · {{ attLine(c.form).kwic!.loc }}</span></p>
              <p v-else-if="attLine(c.form).loading" class="small sans muted" style="margin:.2rem 0">Пам’ятка: завантаження…</p>
            </template>
            <DerivationSteps :steps="c.trace" :extra="c.stepEvidence" :uid="c.form" />
          </li>
          <li v-if="!back.length" class="muted">Жодна реконструкція не пройшла кругову перевірку: <span class="unk">невідомо</span>.</li>
        </ul>
        <p class="small muted sans">Кроки показано від сучасної форми до давньої; кожен крок — обернене правило з цитатою, а виведена форма відтворює вхідну через derive().</p></section>

      <section v-if="why.length" class="card"><h2><span>Які принципи могли діяти</span></h2>
        <ul class="sans small" style="list-style:none;padding:0;margin:0">
          <li v-for="p in why" :key="p.rule" style="margin:.5rem 0"><strong>{{ p.rule }}</strong> {{ p.name }} <span class="muted">({{ p.date }})</span>
            <span v-if="p.supported" class="badge">✓ підтверджено парадигмою</span><span v-else class="derived-badge">можливо</span>
            <EvidenceList v-if="p.supported" :evidence="p.evidence" /></li>
        </ul></section>
    </template>
  </template>
</template>
