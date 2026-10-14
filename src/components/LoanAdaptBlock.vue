<script setup lang="ts">
/** SPEC 63 LA-3: «запозичення» block. Source word, route, rule chain (each rule an evidence popover → /source card, and a /method anchor), normative status. Hidden when no rule fires. */
import { computed } from 'vue'
import { analyzeLoan, ROUTE_UK } from '../../core/loan-adapt.ts'
import { useData } from '../composables/useData.ts'
import { lexHas } from '../lib/lexhas.ts'
import { literaryOf } from '../lib/sociolectData.ts'
import ClaimBadge from './ClaimBadge.vue'
const props = defineProps<{ word: string }>()
const { annData } = useData()
const a = computed(() => analyzeLoan(props.word, {
  vesum: w => { const l = literaryOf(w); if (l) return l.status === 'present' ? l.tags ?? 'є' : null; return lexHas(annData.value)(w) === 'vesum' ? 'є у даних ВЕСУМ у браузері' : undefined },
}))
const vesumText = computed(() => ({ present: 'є у ВЕСУМ', absent: 'немає у ВЕСУМ', unchecked: 'у ВЕСУМ не перевірено (у браузері повного списку немає)' }[a.value!.status.vesum]))
</script>

<template>
  <section v-if="a" class="loan-adapt" data-testid="loan-adapt" :aria-label="'запозичення: ' + word">
    <h3>запозичення</h3>
    <p class="sans small"><span class="muted">джерело:</span> <b data-testid="loan-source">{{ a.source }}</b> · <span class="badge" data-testid="loan-route">{{ ROUTE_UK[a.route] }}</span>
      <span v-for="r in a.routes.slice(1)" :key="r" class="badge muted"> + {{ ROUTE_UK[r] }}</span></p>
    <ol class="sans small loan-chain">
      <li v-for="s in a.steps" :key="s.id"><RouterLink :to="{ path: '/method', hash: '#la-' + s.id }"><code>{{ s.uk }}</code></RouterLink> ← <code>{{ s.src }}</code>
        <ClaimBadge :claim="s.claim" :text="s.id" tone="usage" /></li>
    </ol>
    <p class="sans small" data-testid="loan-status"><span class="muted">норма:</span> {{ vesumText }}<template v-if="a.status.pravopys.length"> · орфографія за
      <template v-for="(p, i) in a.status.pravopys" :key="p.rule + p.loc"><RouterLink :to="`/source/PRAV`">Правопис 2019</RouterLink> ({{ p.rule }}){{ i < a.status.pravopys.length - 1 ? ', ' : '' }}</template></template></p>
    <p v-if="a.equivalent && a.equivalent.value !== 'unknown'" class="sans small" data-testid="loan-equivalent"><span class="muted">стандартний відповідник:</span>
      <ClaimBadge :claim="a.equivalent" :text="String(a.equivalent.value)" tone="usage" /></p>
  </section>
</template>
