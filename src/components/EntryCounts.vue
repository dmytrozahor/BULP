<script setup lang="ts">
/** CV-4b: the three entry counters of boot.json, labelled; their sum is the total (nEntries). */
import { computed } from 'vue'
import { fmtNum } from '../lib/format.ts'
const props = defineProps<{ corpus: { nAttested?: number; nLemmas?: number; nDictOnly?: number; nUvAtt?: number } }>()
const parts = computed(() => [
  ['засвідчені', props.corpus.nAttested ?? props.corpus.nLemmas ?? 0],
  ['лише словник', props.corpus.nDictOnly ?? 0],
  ['засвідчені, немає в словниках', props.corpus.nUvAtt ?? 0],
] as const)
</script>
<template><span data-test="entry-parts"><template v-for="([l, n], i) in parts" :key="l"><template v-if="i"> + </template><span :data-part="l">{{ fmtNum(n) }} {{ l }}</span></template></span></template>
