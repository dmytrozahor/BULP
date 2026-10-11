<script setup lang="ts">
/**
 * SPEC 00 P-1.1 / P-3.1: a label is a Claim; the value is shown with an evidence popover (Q/P/D). 'unknown' renders muted with the tooltip
 * «немає доказів — значення не встановлено (P-3.1)». P-1.7: score and method are shown inside the popover, never as a dictionary fact.
 */
import { computed } from 'vue'
import type { Claim } from '../../core/evidence.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ claim: Claim<unknown>; text?: string; unknownText?: string; tone?: string }>()
const known = computed(() => props.claim.value !== 'unknown')
const meta = computed(() => [props.claim.method && `метод: ${props.claim.method}`, props.claim.score != null && `score ${props.claim.score}`].filter(Boolean).join(' · '))
</script>

<template>
  <span v-if="!known" class="unk" tabindex="0" title="немає доказів — значення не встановлено (P-3.1)">{{ unknownText ?? 'невідомо' }}</span>
  <EvidencePopover v-else :evidence="claim.evidence" :heading="text" :meta="meta" :label="text">
    <span :class="['badge', tone]">{{ text ?? String(claim.value) }}<small v-if="claim.score != null" class="muted">{{ claim.score }}</small><i class="evmark" aria-hidden="true">ⓘ{{ claim.evidence.length }}</i></span>
  </EvidencePopover>
</template>
