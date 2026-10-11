<script setup lang="ts">
/**
 * SPEC 00 P-1.5 / SPEC 30 D-4.3: step-by-step trace, each step expandable to the rule's Shevelov quote + locator (EvidenceList)
 * and, for backward steps, the VESUM paradigm forms that licensed the choice (stepEvidence).
 */
import { ref } from 'vue'
import type { Evidence } from '../../core/evidence.ts'
import { ruleById } from '../../core/phonology.ts'
import type { TraceStep } from '../../core/types.ts'
import EvidenceList from './EvidenceList.vue'
const props = defineProps<{ steps: TraceStep[]; extra?: Evidence[][]; uid: string }>()
const open = ref<number | null>(null)
const toggle = (i: number) => (open.value = open.value === i ? null : i)
</script>

<template>
  <ol class="dsteps" :aria-label="`Кроки: ${uid}`">
    <li v-for="(s, i) in props.steps" :key="i">
      <button type="button" :aria-expanded="open === i" @click="toggle(i)">
        <span class="mono">{{ s.from }}</span> → <span class="mono">{{ s.to }}</span> · <strong>{{ s.rule }}</strong> {{ ruleById[s.rule]?.name }}
      </button>
      <div v-if="open === i && ruleById[s.rule]" class="card" style="margin:.3rem 0">
        <div class="small"><strong>{{ s.rule }}</strong> {{ ruleById[s.rule]!.name }} · {{ ruleById[s.rule]!.date }} · сфера {{ ruleById[s.rule]!.scope }}</div>
        <EvidenceList :evidence="[ruleById[s.rule]!.cite, ...(props.extra?.[i] ?? [])]" />
      </div>
    </li>
    <li v-if="!props.steps.length" class="small muted">змін немає</li>
  </ol>
</template>
