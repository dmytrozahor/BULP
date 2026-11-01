<script setup lang="ts">
/**
 * SPEC 63 CP-11 — on a REAL page: the original form (singular of a plurale tantum, the base of a derivation, down the chain) and the derived forms, each its own page; the ones no source
 * attests wear «гіпотеза, без доказів». Lazy (async component), reads only the shards the card route already uses.
 */
import { ref, watch } from 'vue'
import { HYP_BADGE } from '../../core/hypothesis.ts'
import { relationsOf, type Relation } from '../lib/hypothesis.ts'
import HypNotes from './HypNotes.vue'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ word: string; tags?: string; /** the card's own spellings (corpus), for the attested и/і variants */ forms?: string[] }>()
const rels = ref<Relation[]>([]), done = ref(false)
const ROLE = { plural: 'множина', singular: 'однина', variant: 'варіант', swap: 'варіант з и/і', attested: 'засвідчений варіант', derived: 'похідне', base: 'похідне від' } as const
watch(() => [props.word, props.tags] as const, async ([w, t]) => {
  done.value = false
  try { const r = await relationsOf(w, t ?? '', undefined, props.forms ?? []); if (w === props.word) rels.value = r } catch { rels.value = [] }
  done.value = true
}, { immediate: true })
</script>

<template>
  <section v-if="rels.length" class="card sans small" data-testid="hyp-links" aria-label="Початкова форма й похідні">
    <strong>Початкова форма й похідні</strong>
    <ul>
      <li v-for="r in rels" :key="r.role + r.form">
        <span class="muted">{{ ROLE[r.role] }}:</span> <RouterLink v-if="r.to" :to="r.to" class="lang">{{ r.form }}</RouterLink><b v-else>{{ r.form }}</b>
        <EvidencePopover v-if="r.evidence" :evidence="r.evidence" heading="Засвідчений варіант и/і" label="джерело варіанта"><span class="badge">ⓘ</span></EvidencePopover>
        <span v-if="r.hyp" class="badge" data-testid="hyp-badge" :title="r.rule.uk">{{ HYP_BADGE }}</span> <HypNotes :notes="r.notes" />
        <span class="muted"> · {{ r.rule.pattern }}</span>
      </li>
    </ul>
  </section>
</template>
