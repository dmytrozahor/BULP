<script setup lang="ts">
/**
 * SPEC 60 LW-1…LW-3 chip «мова-джерело» (core/loanwords.ts, research/26). Priority: a Wiktionary donor label (D-evidence, CC BY-SA) → a class A rule
 * claim (-інг, -унок, -дло, -аж; method LOAN-<id>) → ranked hypotheses «кандидати: …» from the rule classifier, always with its cross-validated accuracy.
 * A rule that disagrees with a label is shown next to it, not hidden. An unattested form (екстремітет) is marked «гіпотетична форма».
 * Renders nothing for a word that no rule and no label marks as foreign (P-3.1).
 */
import { computed } from 'vue'
import { DONOR_UK, LOAN_CV_NOTE, analyzeLoan, type Donor } from '../../core/loanwords.ts'
import type { Evidence } from '../../core/evidence.ts'
import { loanLabels } from '../lib/datasets.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ word: string; attested?: boolean }>()
const a = computed(() => analyzeLoan(props.word, { attested: props.attested ?? true, labels: loanLabels }))   // labels: loanlabels.json (lazy, reactive), not the 13 seed labels
const pct = (p: number) => `${Math.round(p * 100)} %`
const d = (x: Donor) => DONOR_UK[x]
const text = computed(() => {
  const r = a.value
  if (r.label && r.label.value !== 'unknown') return `мова-джерело: ${d(r.label.value.donor)}`
  const c = r.claims[0]
  if (c && c.value !== 'unknown') return `мова-джерело (за правилом): ${d(c.value.donor)}`
  return `кандидати: ${r.hypotheses.slice(0, 2).map(h => `${d(h.donor)} ${pct(h.p)}`).join(' · ')}`
})
const kind = computed(() => (a.value.status === 'label' ? 'D' : a.value.status === 'claim' ? 'I' : 'H'))
const evidence = computed<Evidence[]>(() => {
  const r = a.value, ev: Evidence[] = []
  if (r.label) ev.push(...r.label.evidence)
  for (const c of r.claims) ev.push(...c.evidence)
  for (const h of r.hints) ev.push(h.cite)
  return ev
})
const hintDonors = (via: Donor[]) => via.map(d).join(' | ')
</script>

<template>
  <span v-if="a.foreign && (a.label || a.claims.length || a.hypotheses.length)" class="loanchip">
    <EvidencePopover :evidence="evidence" heading="Мова-джерело запозичення" :meta="`${a.status === 'label' ? 'мітка Вікісловника (D)' : a.status === 'claim' ? 'правило класу A (виведено, P-1.7)' : 'гіпотеза'}`" :label="text">
      <span :class="['badge', kind === 'H' ? 'unk' : 'contact']" :title="a.hypotheticalForm ? 'гіпотетична форма' : ''">{{ text }}<small v-if="kind === 'H'" class="muted">гіпотеза</small><i class="evmark" aria-hidden="true">ⓘ</i></span>
      <template #extra>
        <p v-if="a.hypotheticalForm" class="small sans" style="margin:.5rem 0 .3rem"><strong>гіпотетична форма</strong>, не засвідчена: у словнику, ВЕСУМ і Вікісловнику її немає; лише правило.</p>
        <p v-if="a.label && a.label.value !== 'unknown'" class="small sans" style="margin:.4rem 0">Вікісловник (CC BY-SA 4.0): {{ a.label.value.path }}.</p>
        <p v-if="a.conflict" class="small sans" style="margin:.4rem 0"><strong>розбіжність:</strong> правило {{ a.conflict.rule }} вказує {{ a.conflict.ruleDonors.map(d).join(' | ') }}, мітка — {{ d(a.conflict.labelDonor) }}. Показано обидва, не вирішено.</p>
        <ul v-if="a.claims.length || a.hints.length" class="small sans" style="margin:.3rem 0;padding-left:1.1rem">
          <li v-for="c in a.claims" :key="c.method">{{ c.method }}: {{ c.value !== 'unknown' ? c.value.path : '' }} <span class="attested-badge">клас A</span></li>
          <li v-for="h in a.hints" :key="h.rule"><code>{{ h.rule }}</code> {{ h.label }} → {{ h.ultimate ? d(h.ultimate) + ' → ' : '' }}{{ hintDonors(h.via) }} <span class="derived-badge">клас {{ h.weight }}</span><br /><span class="muted">{{ h.path }}. {{ h.counts }}</span></li>
        </ul>
        <p v-if="a.hypotheses.length" class="small sans" style="margin:.3rem 0">Кандидати: <template v-for="(h, i) in a.hypotheses" :key="h.donor"><template v-if="i"> · </template>{{ d(h.donor) }} {{ pct(h.p) }}</template></p>
        <p class="small sans muted" style="margin:.3rem 0">{{ LOAN_CV_NOTE }}</p>
      </template>
    </EvidencePopover>
  </span>
</template>
