<script setup lang="ts">
/**
 * SPEC 00 P-2.4: "Period-appropriate labels: ruthenian-rus (11th–13th c., shown as «Kyivan Rus' author», never «Ukrainian author»)".
 * The name opens the author's self-identification evidence (P-2.1), the badge shows the period label.
 */
import { computed } from 'vue'
import { authorInfo, loadAuthorEvidence, useData } from '../composables/useData.ts'
import { AUTHOR_LABEL_UK, STATUS_UK } from '../lib/format.ts'
import { personTo } from '../lib/nav.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ author: string; witness?: string }>()
const { witnessById } = useData()
const a = computed(() => authorInfo(props.author, props.witness ? witnessById.value.get(props.witness) : undefined))
</script>
<template>
  <span class="authorbadge" @pointerenter.once="loadAuthorEvidence()" @focusin.once="loadAuthorEvidence()">
    <EvidencePopover v-if="a.evidence.length" :evidence="a.evidence" :heading="`Самоідентифікація: ${a.name}`" meta="P-2.1" :label="a.name"><strong>{{ a.name }}</strong></EvidencePopover>
    <strong v-else :tabindex="a.pending ? 0 : undefined" :title="a.pending ? 'самоідентифікація завантажується' : undefined">{{ a.name }}</strong>
    <RouterLink class="small" :to="personTo(a.id)" :title="`сторінка постаті: ${a.name}`" aria-label="сторінка постаті">→</RouterLink>
    <span v-if="a.label" class="authlabel" :title="`статус: ${STATUS_UK[a.status ?? ''] ?? ''}`"> {{ AUTHOR_LABEL_UK[a.label] }}<template v-if="a.status && a.status !== 'vetted'"> · {{ STATUS_UK[a.status] }}</template></span>
  </span>
</template>
