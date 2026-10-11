<script setup lang="ts">
/** «Реконструйовані форми» — reverse(lemma) with the lemma's VESUM paradigm; always the derived (dashed, italic) class, never mixed with attested spellings. */
import { computed } from 'vue'
import type { LemmaCard } from '../../core/types.ts'
import { useData } from '../composables/useData.ts'
import { attestIndex, reconstruct } from '../lib/derive.ts'
import FormBadge from './FormBadge.vue'
const props = defineProps<{ card: LemmaCard; max?: number }>()
const { cards, searchIdx, byLemma } = useData()
const att = computed(() => attestIndex(cards.value))
const list = computed(() => reconstruct(props.card.lemma, searchIdx.value, byLemma.value, att.value).candidates.slice(0, props.max ?? 6))
</script>

<template>
  <div v-if="list.length" class="recon">
    <h3 class="sans small muted" style="margin:.8rem 0 .3rem">Реконструйовані форми <span class="derived-badge">гіпотези</span></h3>
    <ul style="list-style:none;padding:0;margin:0">
      <li v-for="c in list" :key="c.form" style="margin:.25rem 0">
        <FormBadge :kind="c.status === 'confirmed-by-attestation' ? 'confirmed' : 'derived'" :form="c.form" :lemma="att.get(c.form)?.lemma" />
        <span class="small muted"> {{ c.trace.map(t => t.rule).join(' → ') }}</span>
      </li>
    </ul>
    <RouterLink class="small sans" :to="{ path: '/derive', query: { from: card.lemma, dir: 'new2old' } }">Покроково з цитатами →</RouterLink>
  </div>
</template>
