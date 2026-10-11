<script setup lang="ts">
/**
 * A set of label claims. Ordinary labels = ClaimBadge. A `rusyn:*` claim is drawn as a PARALLEL reading next to the Ukrainian-dialectology reading
 * (dialect:ZAK / dialect:LEM): neither wins, the question language-vs-dialect stays open (research/10 §0, §5). The block always carries the neutral
 * status note with the evidence of both positions (popover «статус»). Absent dialect side is shown as «не встановлено» (P-3.1), never silently dropped.
 */
import { computed } from 'vue'
import type { Claim } from '../../core/evidence.ts'
import { DIALECTS, RUSYN_STATUS } from '../../core/rules.ts'
import type { ContractCorpus } from '../lib/contract.ts'
import { useData } from '../composables/useData.ts'
import { categoryOf, isRusyn } from '../lib/analyze.ts'
import { labelUk } from '../lib/format.ts'
import ClaimBadge from './ClaimBadge.vue'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ claims: Record<string, Claim<unknown>> }>()
const { corpus } = useData()
const status = computed(() => (corpus.value as ContractCorpus | undefined)?.rusynStatus ?? RUSYN_STATUS)
const name = (l: string) => DIALECTS[l] ?? labelUk(l)
/** the contract key `rusyn` carries the axis label in its VALUE ('rusyn:lemko' …); other claims are keyed by their label */
const lab = (l: string, c: Claim<unknown>) => (l === 'rusyn' && typeof c.value === 'string' ? c.value : l)
const entries = computed(() => Object.entries(props.claims).map(([l, c]) => [lab(l, c), c] as [string, Claim<unknown>]))
const rusyn = computed(() => entries.value.filter(([l]) => isRusyn(l)))
const parallel = computed(() => entries.value.filter(([l]) => l === 'ZAK' || l === 'LEM'))
const plain = computed(() => entries.value.filter(([l]) => !isRusyn(l) && !(rusyn.value.length && (l === 'ZAK' || l === 'LEM'))))
</script>

<template>
  <span class="claimset">
    <ClaimBadge v-for="[l, c] in plain" :key="l" :claim="c" :text="name(l)" :tone="categoryOf(l) ?? ''" />
    <span v-if="rusyn.length" class="parallel" role="group" aria-label="Два паралельні прочитання: діалектологічне й русинський стандарт">
      <span class="small muted">два прочитання, жодне не переважає:</span>
      <span class="small">діалектологія:</span>
      <ClaimBadge v-for="[l, c] in parallel" :key="l" :claim="c" :text="name(l)" tone="dialect" />
      <span v-if="!parallel.length" class="unk" tabindex="0" title="немає доказів — значення не встановлено (P-3.1)">не встановлено</span>
      <span class="small">русинський стандарт:</span>
      <ClaimBadge v-for="[l, c] in rusyn" :key="l" :claim="c" :text="name(l)" tone="rusyn" />
      <EvidencePopover :evidence="status.evidence" heading="Статус русинської: нейтральна примітка" :meta="status.note" label="статус русинської">
        <span class="badge">ⓘ статус: мова чи говір — питання відкрите</span>
      </EvidencePopover>
    </span>
  </span>
</template>
