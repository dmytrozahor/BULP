<script setup lang="ts">
/** MO-2: «сучасний правопис: …» — suggestions of core/modernize.ts with the § chips and an evidence popover; hints are dashed (P-3.1). */
import type { Modernization } from '../../core/modernize.ts'
import EvidencePopover from './EvidencePopover.vue'
defineProps<{ mods: Modernization[] }>()
</script>

<template>
  <div v-if="mods.length" class="small sans" style="margin:.2rem 0 0 .6rem">
    <span class="muted">сучасний правопис:</span>
    <span v-for="m in mods" :key="m.form" style="margin-right:.8rem">
      <strong :class="['lang', m.status === 'vesum' ? 'attested' : 'derived']">{{ m.form }}</strong>
      <span :class="m.status === 'vesum' ? 'attested-badge' : 'derived-badge'">{{ m.status === 'vesum' ? '✓ є в словнику' : m.status === 'rule' ? 'за правилом' : 'гіпотеза: лише за правилом' }}</span>
      <EvidencePopover :evidence="m.claim.evidence" heading="Докази: сучасний правопис" :label="m.form"><span class="badge">ⓘ {{ m.steps.map(s => s.section).join(', ') }}</span></EvidencePopover>
    </span>
  </div>
</template>
