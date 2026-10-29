<script setup lang="ts">
/**
 * SPEC 63 PS-8: a text snippet (KWIC context, sense example, quotation) in which the build's high-confidence person mentions of this witness at this locator are clickable links
 * to /person/:id (tooltip «постать: Ім'я (роки) — підстава: …»). Nothing is matched here: the client only renders the mentions sidecar (persons/mentions/m<N>.json).
 */
import { computed } from 'vue'
import { mentionsOf, personTipOf, personsIndex } from '../lib/personsData.ts'
import { splitMentions } from '../lib/mentionSplit.ts'
import { personTo } from '../lib/nav.ts'
const props = defineProps<{ text: string; witness?: string; loc?: string }>()
const parts = computed(() => { void personsIndex.value; return props.witness ? splitMentions(props.text, mentionsOf(props.witness).filter(m => !props.loc || m.loc === props.loc)) : [{ t: props.text }] })
</script>
<template><template v-for="(x, i) in parts" :key="i"><RouterLink v-if="'p' in x" class="pmention" :to="personTo(x.p)" :title="personTipOf(x.p, x.why)">{{ x.t }}</RouterLink><template v-else>{{ x.t }}</template></template></template>
<style>.pmention { text-decoration: underline dotted; color: inherit; }</style>
