<script setup lang="ts">
/** MD-3 badges «сучасний сленг» · «ІТ-жаргон» · «неологізм (з року)»: computed from ingested rows; the popover shows the first-attestation date, its kind (crawl / entry) and the source. */
import { computed } from 'vue'
import { modernOf } from '../lib/modernData.ts'
import ClaimBadge from './ClaimBadge.vue'
const props = defineProps<{ word: string }>()
const items = computed(() => modernOf(props.word))
</script>

<template>
  <span v-if="items.length" class="usage-chips modern-badges" data-testid="modern-badges">
    <ClaimBadge v-for="b in items" :key="b.id" :claim="b.claim" :text="b.text" :tone="'usage usage-sociolect modern-' + b.id" />
    <span v-if="items[0]?.first" class="muted small" data-testid="modern-first">перша фіксація: {{ items[0].first }}</span>
  </span>
</template>
