<script setup lang="ts">
/**
 * U-16 / U-10: every citation shows WHO (author, vetted label), WHAT (witness title), WHERE (locator) and WHEN (date),
 * and links to the document at that place. The witness id resolves through corpus.json; an unknown id is shown as is, never invented.
 */
import { computed } from 'vue'
import type { Kwic } from '../../core/types.ts'
import { fmtDate } from '../lib/format.ts'
import { sourceLink } from '../lib/source.ts'
import { useData } from '../composables/useData.ts'
import AuthorBadge from './AuthorBadge.vue'
const props = defineProps<{ w: string; loc: string; date?: [number, number]; kwic?: Pick<Kwic, 'left' | 'node' | 'right'> }>()
const { witnessById } = useData()
const wit = computed(() => witnessById.value.get(props.w))
const link = computed(() => sourceLink(wit.value, props.loc, props.kwic))
</script>

<template>
  <span class="srccite">
    <AuthorBadge v-if="wit" :author="wit.author" :witness="w" />
    <template v-if="wit"> · </template>
    <span class="srctitle">{{ wit?.title ?? w }}</span>
    · <span class="srcloc"><span class="muted">локатор:</span> {{ loc }}</span>
    <template v-if="date"> · {{ fmtDate(date) }}</template>
    <template v-if="link"> · <a class="srclink" :href="link.url" target="_blank" rel="noopener">{{ link.label }} ↗</a></template>
  </span>
</template>
