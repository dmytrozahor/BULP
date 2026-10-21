<script setup lang="ts">
/**
 * SPEC 63 RU-3: «рос. видання» / «рос. джерело» badge (core/ru-source.ts) with the standing warning as tooltip and a link to the evidence (research/46).
 * One component for every place a source is shown (KWIC cite, witness list / graph, sense row, first attestation, etymology / cognate evidence), so every card kind shows it alike.
 */
import { computed } from 'vue'
import { RU_EVIDENCE_URL, RU_KIND_UK, RU_LABEL, RU_TIP, type RuFlag } from '../../core/ru-source.ts'
const props = defineProps<{ flag?: RuFlag }>()
const label = computed(() => (props.flag ? RU_LABEL[props.flag.kind] : ''))
const tip = computed(() => (props.flag ? `${RU_TIP} (${RU_KIND_UK[props.flag.kind]}: ${props.flag.why})` : ''))
</script>

<template>
  <span v-if="flag" class="ru-src" data-testid="ru-badge"><span class="badge ru-badge" :title="tip" :data-kind="flag.kind" tabindex="0">{{ label }}</span><a class="srclink small" :href="RU_EVIDENCE_URL" target="_blank" rel="noopener" title="докази: research/46-russian-sources.md" aria-label="докази щодо російських джерел">↗</a></span>
</template>

<style scoped>
.ru-badge { border-color: var(--m-archaic); }
.ru-src { white-space: nowrap; }
</style>
