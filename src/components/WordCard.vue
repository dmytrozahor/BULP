<script setup lang="ts">
/**
 * Compact card of one annotated token. Attested = solid; derived (reserved, later feature) = dashed + italic + «реконструкція» badge.
 * Labels are ClaimBadges (evidence popover). Statuses follow src/lib/annotate.ts.
 */
import { computed } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { DIALECTS } from '../../core/rules.ts'
import type { AnnotatedToken } from '../lib/annotate.ts'
import { authorInfo, useData } from '../composables/useData.ts'
import { categoryOf } from '../lib/analyze.ts'
import { epochName, fmtDate, labelUk } from '../lib/format.ts'
import ClaimBadge from './ClaimBadge.vue'
import DerivationSteps from './DerivationSteps.vue'
import ReconstructedForms from './ReconstructedForms.vue'
import StressForms from './StressForms.vue'
const props = defineProps<{ t: AnnotatedToken }>()
const { witnessById } = useData()
const first = computed(() => (props.t.card && isKnown(props.t.card.first) ? props.t.card.first.value : undefined))
const who = computed(() => (first.value ? authorInfo(first.value.author, witnessById.value.get(first.value.witness)).name : ''))
const STATUS_UK = { attested: 'засвідчено в корпусі', lexindex: 'відомо лише з індексу ВЕСУМ/LT', rules: 'немає в словниках; спрацювали лише правила з джерелом', unknown: 'невідомо' } as const
const name = (l: string) => DIALECTS[l] ?? labelUk(l)
</script>

<template>
  <div class="wcard" aria-live="polite">
    <div class="row" style="margin-bottom:.3rem">
      <strong :class="['lang', t.provenance]" style="font-size:1.25rem; font-family:var(--serif)">{{ t.raw }}</strong>
      <span v-if="t.provenance === 'derived'" class="derived-badge">реконструкція (гіпотеза)</span>
      <span class="muted small">{{ t.provenance === 'derived' ? 'не засвідчено: виведено за правилами' : STATUS_UK[t.status] }}</span>
    </div>
    <div v-if="t.provenance === 'derived' && t.derivedFrom" class="small" style="margin-bottom:.3rem">
      <span class="muted">виведення:</span> {{ t.raw }} → <strong>{{ t.derivedFrom.form }}</strong>
      <RouterLink :to="{ path: '/derive', query: { from: t.raw, dir: 'old2new', to: t.derivedFrom.form } }">покроково з цитатами →</RouterLink>
      <DerivationSteps :steps="t.derivedFrom.trace" :uid="t.raw" />
    </div>
    <template v-if="t.status === 'attested' && t.card">
      <div>лема: <RouterLink :to="`/w/${encodeURIComponent(t.card.lemma)}`"><strong>{{ t.card.lemma }}</strong></RouterLink> <span class="muted">{{ t.card.pos }}</span></div>
      <div v-if="t.form && t.form.raw !== t.card.lemma" class="small muted">написання «{{ t.form.raw }}» → {{ t.form.modern }}
        <template v-if="t.form.derivation.length">({{ t.form.derivation.map(s => s.rule).join(' → ') }})</template></div>
      <div v-else-if="t.via === 'paradigm'" class="small muted">словоформа з парадигми ВЕСУМ</div>
      <div v-if="first">перша фіксація: <strong>{{ fmtDate(first.date) }}</strong>, {{ who }}</div>
      <div v-else>перша фіксація: <ClaimBadge :claim="t.card.first" /></div>
      <div v-if="t.epoch" class="small muted">епоха першої фіксації: {{ epochName(t.epoch) }}</div>
      <div style="margin:.2rem 0"><span class="muted">наголос: </span><StressForms :variants="t.card.stress" /></div>
      <ReconstructedForms v-if="t.provenance === 'attested'" :card="t.card" :max="3" />
    </template>
    <div v-else-if="t.status === 'lexindex'" class="small">
      <div v-if="t.vesum?.length">ВЕСУМ: <code v-for="(h, i) in t.vesum" :key="i" style="margin-right:.5rem" :title="h.tags">{{ h.lemma }} {{ h.tags }}</code></div>
      <div v-if="t.lt">LanguageTool: {{ t.lt[0] }} → «{{ t.lt[1] }}»</div>
      <span class="muted">Знайдено в lexindex (ВЕСУМ нестандартні / LanguageTool); лему в словнику корпусу не створено.</span>
    </div>
    <div v-else class="small muted">
      Слова немає ні в словнику, ні в індексі: мітки не ставляться (немає доказів — P-3.1).
      <RouterLink :to="{ path: '/analyze', query: { q: t.raw } }">Проаналізувати →</RouterLink>
    </div>
    <div v-if="Object.keys(t.claims).length" class="row" style="margin-top:.35rem">
      <ClaimBadge v-for="(c, l) in t.claims" :key="l" :claim="c" :text="name(String(l))" :tone="categoryOf(String(l)) ?? ''" />
    </div>
    <div v-else-if="t.status !== 'unknown'" class="small muted" style="margin-top:.3rem">міток немає — <span class="unk">не визначено</span></div>
    <div v-if="t.hints.length" class="small muted">гіпотези без джерела: {{ t.hints.map(h => h.rule).join(', ') }}</div>
    <RouterLink v-if="t.status === 'attested' && t.card" :to="`/w/${encodeURIComponent(t.card.lemma)}`" class="small">Відкрити картку слова →</RouterLink>
  </div>
</template>
