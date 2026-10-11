<script setup lang="ts">
/**
 * SPEC 00 P-1.7 "Anything inferred (metre-derived stress …) is labelled with method and never shown as a dictionary fact";
 * P-3.1 stress status defaults to unknown. U+0301 is placed by core/text.ts renderStress (research/08 A3).
 * Variable stress shows all variants with status and source.
 */
import type { StressVariant } from '../../core/types.ts'
import { renderStress } from '../../core/text.ts'
import { METHOD_UK, STRESS_STATUS_UK } from '../lib/format.ts'
import EvidencePopover from './EvidencePopover.vue'
defineProps<{ variants: StressVariant[] }>()
</script>
<template>
  <span v-if="!variants.length" class="unk" tabindex="0" title="немає доказів — значення не встановлено (P-3.1)">наголос невідомий</span>
  <template v-else><span v-for="(v, i) in variants" :key="i" class="stressv">
    <EvidencePopover :evidence="v.evidence" :heading="`Наголос: ${renderStress(v.form, v.positions)}`" :meta="`метод: ${v.method}`" :label="renderStress(v.form, v.positions)">
      <strong style="font-size:1.15rem">{{ renderStress(v.form, v.positions) }}</strong>
    </EvidencePopover>
    <span class="st">{{ STRESS_STATUS_UK[v.status] }} · {{ METHOD_UK[v.method] }}<template v-if="v.period"> · {{ v.period }}</template></span>
  </span></template>
</template>
