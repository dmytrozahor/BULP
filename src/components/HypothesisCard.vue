<script setup lang="ts">
/**
 * SPEC 63 CP-11 — the page of a hypothetical form (an original / derived form no source attests). Generated at route time (src/lib/hypothesis.ts), never shipped per word.
 * It is marked as a hypothesis at the top («гіпотеза, без доказів»), grades itself «гіпотетична форма: у жодному джерелі не засвідчена», names the rule that produced it with the
 * rule's cite (or kind P «джерела не знайдено»), and links to the real pages it is derived from.
 */
import { computed } from 'vue'
import { HYP_BADGE, HYP_GRADE } from '../../core/hypothesis.ts'
import type { Hypothesis, Relation } from '../lib/hypothesis.ts'
import EvidencePopover from './EvidencePopover.vue'
import HypNotes from './HypNotes.vue'
import SenseEpochs from './SenseEpochs.vue'
const props = defineProps<{ hyp: Hypothesis }>()
const ROLE: Record<Relation['role'], string> = { plural: 'множина (засвідчена)', singular: 'однина', variant: 'варіант', swap: 'варіант з и/і', attested: 'засвідчений варіант', derived: 'похідне', base: 'похідне від' }
const rels = computed(() => props.hyp.relations)
</script>

<template>
  <article class="card hyp" data-testid="hyp-card" role="status">
    <h1 class="lemma"><span class="hyp-word">{{ hyp.word }}</span> <span class="badge hyp-badge" data-testid="hyp-badge">{{ HYP_BADGE }}</span> <HypNotes :notes="hyp.notes" /></h1>
    <p class="sans small" data-testid="hyp-grade"><b>Оцінка:</b> {{ HYP_GRADE }}. Це не слово словника й не засвідчена форма: сторінка існує, щоб початкова форма не була «дірою» у групі споріднених слів.</p>
    <h2 class="sans">Звідки гіпотеза</h2>
    <ul class="sans small" data-testid="hyp-rules">
      <li v-for="r in hyp.rules" :key="r.id"><code>{{ r.pattern }}</code> {{ r.uk }}
        <EvidencePopover :evidence="hyp.claim.evidence.filter(e => e.locator.includes(r.id)).concat(r.cite)" :heading="`Правило ${r.id}`" label="джерело правила"><span class="badge">ⓘ P · джерела не знайдено</span></EvidencePopover></li>
    </ul>
    <h2 class="sans">Пов’язані сторінки</h2>
    <ul class="sans small" data-testid="hyp-rels">
      <li v-for="r in rels" :key="r.role + r.form">
        <span class="muted">{{ ROLE[r.role] }}:</span> <RouterLink :to="r.to" class="lang">{{ r.form }}</RouterLink>
        <span v-if="r.hyp" class="badge">{{ HYP_BADGE }}</span><code v-else-if="r.tags" class="muted"> {{ r.tags }}</code> <HypNotes :notes="r.notes" />
        <span class="muted"> · {{ r.rule.pattern }}</span>
      </li>
    </ul>
    <h2 class="sans" id="hyp-h-se">Значення за епохами</h2>   <!-- CP-12: on every card, also here; a hypothesis has no senses -->
    <SenseEpochs :word="hyp.word" kind="hyp" hypothesis compact />
  </article>
</template>
