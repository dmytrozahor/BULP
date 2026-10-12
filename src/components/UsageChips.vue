<script setup lang="ts">
/** UL-1 chips «вжиток»: one ClaimBadge per usage label of the lemma (stylistic · sociolect · territorial · chronological · thematic); renders nothing when the lemma has no label. */
import { computed } from 'vue'
import { AXIS_UK } from '../../core/usage.ts'
import { usageOf } from '../lib/usageData.ts'
import ClaimBadge from './ClaimBadge.vue'
const props = defineProps<{ lemma: string; label?: boolean }>()
const items = computed(() => usageOf(props.lemma))
</script>

<template>
  <span v-if="items.length" class="usage-chips">
    <span v-if="label" class="muted">вжиток: </span>
    <ClaimBadge v-for="u in items" :key="u.label.id" :claim="u.claim" :text="u.label.uk" :tone="'usage usage-' + u.label.axis" :title="AXIS_UK[u.label.axis]" />
  </span>
</template>
