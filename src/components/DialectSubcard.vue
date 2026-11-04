<script setup lang="ts">
/**
 * SPEC 63 DB-3 — the dialect subcard on top of a lemma page (full, light, /lw): the dialect variant of the lemma, with an arrow back to the standard lemma view.
 * > owner 2026-11-04: «і одразу переключай на сторінці леми одразу на варіант леми за діалектом, і потім повернутися має бути стрілочка назад. тобто це така собі підкартка»
 * Header = the dialect form (a printed one from the CR-1 group or the card, else «виведено за правилами»), the evidence of a printed form, the attestations of THAT spelling in the corpus
 * (first fixation, witnesses, examples), the lemma's paradigm forms respelled for the dialect, and a link to the standard card that follows below. Uses only the data the page already holds.
 */
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import type { Kwic } from '../../core/types.ts'
import { key } from '../../core/text.ts'
import type { SubPlan } from '../../core/subcard.ts'
import { useData } from '../composables/useData.ts'
import { dialect, show, type ViewCtx } from '../lib/views.ts'
import { fmtDate } from '../lib/format.ts'
import { witnessTo } from '../lib/nav.ts'
import type { SubForm } from '../lib/useSubcard.ts'
import EvidenceList from './EvidenceList.vue'
const props = defineProps<{ lemma: string; plan: SubPlan; dialectName: string; back: RouteLocationRaw; forms?: SubForm[]; paradigm?: { form: string; tags: string }[]; ctx?: ViewCtx }>()
const { witnessById } = useData()
const mine = computed(() => (props.forms ?? []).filter(f => key(f.raw) === key(props.plan.form) || (f.modern && key(f.modern) === key(props.plan.form))))
const first = computed(() => mine.value.reduce<[number, number] | undefined>((b, f) => (!b || f.date[0] < b[0] ? f.date : b), undefined))
const wits = computed(() => {
  const by = new Map<string, number>(); for (const f of mine.value) for (const [w, n] of Object.entries(f.byW ?? {})) by.set(w, (by.get(w) ?? 0) + n)
  return [...by].map(([w, n]) => ({ w, n, title: witnessById.value.get(w)?.title ?? w, region: witnessById.value.get(w)?.region, date: witnessById.value.get(w)?.date })).sort((a, b) => (a.date?.[0] ?? 9999) - (b.date?.[0] ?? 9999) || b.n - a.n).slice(0, 6)
})
const examples = computed<Kwic[]>(() => mine.value.flatMap(f => f.kwic ?? []).slice(0, 4))
const pairs = computed(() => {
  const seen = new Set<string>(), out: { from: string; to: string }[] = []
  for (const p of props.paradigm ?? []) { const to = show(p.form, dialect.value, '2019', props.ctx).text; if (to !== p.form && !seen.has(p.form)) { seen.add(p.form); out.push({ from: p.form, to }) } if (out.length >= 14) break }
  return out
})
const gradeText = computed(() => (props.plan.grade === 'attested' ? 'засвідчена форма' : 'виведено за правилами'))
</script>

<template>
  <section class="subcard sans" data-testid="subcard" :data-kind="plan.kind" :aria-label="`Підкартка: ${plan.form} (${dialectName})`">
    <RouterLink :to="back" class="subback" data-testid="subcard-back" :aria-label="`назад до нормативної леми ${lemma}`">← {{ lemma }} <span class="muted">(нормативна лема)</span></RouterLink>
    <h1 class="lemma" data-testid="subcard-form">{{ plan.form }}</h1>
    <p class="small" data-testid="subcard-grade">
      <span :class="['badge', plan.grade === 'attested' ? 'dialect' : 'subderived']" :title="plan.note">{{ gradeText }}</span>
      <span class="muted"> · говір: {{ dialectName }} · {{ plan.note }}</span>
    </p>
    <EvidenceList v-if="plan.ev.length" :evidence="plan.ev" />
    <template v-if="forms">
      <h2 class="small">Засвідчення цього написання</h2>
      <p v-if="first" class="small" data-testid="subcard-first">перша фіксація «{{ plan.form }}»: <strong>{{ fmtDate(first) }}</strong></p>
      <p v-else class="small muted" data-testid="subcard-nofirst">Це написання не знайдено серед написань леми в корпусі (немає свідчень у даних).</p>
      <ul v-if="wits.length" class="small"><li v-for="x in wits" :key="x.w"><RouterLink :to="witnessTo(x.w)">{{ x.title }}</RouterLink><span class="muted"> · {{ x.n }} уживань<template v-if="x.region"> · {{ x.region }}</template></span></li></ul>
      <blockquote v-for="(k, i) in examples" :key="i" class="small subex">{{ k.left }} <mark>{{ k.node }}</mark> {{ k.right }} <span class="muted">({{ k.loc }})</span></blockquote>
    </template>
    <template v-if="pairs.length">
      <h2 class="small">Форми парадигми в цьому говорі <span class="muted">(виведено за правилами)</span></h2>
      <p class="small subpairs" data-testid="subcard-paradigm"><template v-for="(p, i) in pairs" :key="p.from"><template v-if="i"> · </template><span class="muted">{{ p.from }}</span> → <strong>{{ p.to }}</strong></template></p>
    </template>
    <p class="small muted">Нижче — стандартна картка «{{ lemma }}» без змін.</p>
  </section>
</template>
