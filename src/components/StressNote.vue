<script setup lang="ts">
/**
 * SPEC 00 P-3.1 / SPEC 20 B-3.7: status "unknown" means the source is not a normative dictionary — NOT that the stress is absent.
 * So the stressed form(s) are shown, followed by this small note with an ⓘ popover (evidence + explanation).
 */
import type { StressVariant } from '../../core/types.ts'
import EvidencePopover from './EvidencePopover.vue'
defineProps<{ variants: StressVariant[] }>()
</script>
<template>
  <span class="small muted sans stressnote">джерело не нормативне
    <EvidencePopover :evidence="variants.flatMap(v => v.evidence)" heading="Наголос: джерело не нормативне" meta="статус: невідомий" label="джерело наголосу">
      <span class="badge">ⓘ</span>
      <template #extra><p class="small" style="margin:.4rem 0 0">Наголос у словнику є; «невідомий» — це статус, а не відсутність наголосу: джерело не є нормативним словником (SPEC 20 B-3.7), тому «нормативний» не заявляється{{ variants.length > 1 ? '; варіантів кілька — показано всі' : '' }}.</p></template>
    </EvidencePopover>
  </span>
</template>
