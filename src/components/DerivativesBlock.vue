<script setup lang="ts">
/**
 * Word-card block «Похідні» (SPEC 60 DV-3): prefix → derivative. ✓ВЕСУМ / ✓корпус = attested (D-evidence); suggestions are
 * `method: derivation` reconstructions (dashed, «пропозиція», SPEC 30 D-4), never dictionary facts (P-1.7). Renders nothing for a word with no attested derivative and no verb candidates.
 */
import { computed } from 'vue'
import { derivatives } from '../../core/derivation.ts'
import { useData } from '../composables/useData.ts'
import { lexHas } from '../lib/lexhas.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ lemma: string }>()
const { annData, loaded, byLemma } = useData()
const all = computed(() => (loaded.value ? derivatives(props.lemma, lexHas(annData.value)) : []))
const attested = computed(() => all.value.filter(d => d.status !== 'suggestion'))
const suggested = computed(() => all.value.filter(d => d.status === 'suggestion'))
const link = (form: string) => (byLemma.value.has(form) ? `/w/${encodeURIComponent(form)}` : '')
</script>

<template>
  <section v-if="attested.length || suggested.length" class="card" aria-label="Похідні">
    <h2><span>Похідні</span><span class="small">префіксальні · метод: деривація</span></h2>
    <ul v-if="attested.length" class="sans" style="list-style:none;padding:0;margin:0">
      <li v-for="d in attested" :key="d.form" style="margin:.3rem 0">
        <span class="muted small">{{ d.prefix }}</span> →
        <RouterLink v-if="link(d.form)" :to="link(d.form)"><strong class="lang attested">{{ d.form }}</strong></RouterLink><strong v-else class="lang attested">{{ d.form }}</strong>
        <span class="attested-badge">{{ d.status === 'vesum' ? '✓ ВЕСУМ' : '✓ корпус' }}</span>
        <span v-if="d.hint" class="derived-badge" title="префікс без прямої цитати з Правопису: вага 0">префікс без цитати</span>
        <EvidencePopover :evidence="d.claim.evidence" heading="Докази похідного" :label="d.form"><span class="badge">ⓘ докази</span></EvidencePopover>
      </li>
    </ul>
    <p v-else class="small muted sans">Жодного засвідченого похідного (ВЕСУМ / корпус) немає.</p>
    <details v-if="suggested.length" style="margin-top:.4rem">
      <summary class="small sans">пропозиції без засвідчення ({{ suggested.length }}) — реконструкція, а не словникова форма</summary>
      <ul class="sans" style="list-style:none;padding:0;margin:.3rem 0 0">
        <li v-for="d in suggested" :key="d.form" style="display:inline-block;margin:.2rem .8rem .2rem 0">
          <span class="muted small">{{ d.prefix }}</span> → <strong class="lang derived">{{ d.form }}</strong>
          <span class="derived-badge">пропозиція</span>
          <EvidencePopover :evidence="d.claim.evidence" heading="Правило префікса" :label="d.form"><span class="badge">ⓘ</span></EvidencePopover>
        </li>
      </ul>
    </details>
  </section>
</template>
