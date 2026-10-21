<script setup lang="ts">
/**
 * U-16 / U-10: every citation shows WHO (author, vetted label), WHAT (witness title), WHERE (locator) and WHEN (date),
 * and links to the document at that place. The witness id resolves through corpus.json; an unknown id is shown as is, never invented.
 */
import { computed } from 'vue'
import type { Kwic } from '../../core/types.ts'
import { fmtDate } from '../lib/format.ts'
import { sourceLink } from '../lib/source.ts'
import { textTo, witnessTo } from '../lib/nav.ts'
import { useData } from '../composables/useData.ts'
import AuthorBadge from './AuthorBadge.vue'
import RuBadge from './RuBadge.vue'
import { ruOfWitness } from '../../core/ru-source.ts'
const props = defineProps<{ w: string; loc: string; date?: [number, number]; kwic?: Pick<Kwic, 'left' | 'node' | 'right'> }>()
const { witnessById } = useData()
const wit = computed(() => witnessById.value.get(props.w))
const ru = computed(() => ruOfWitness(wit.value))   // SPEC 63 RU-3: Russian edition / description
const link = computed(() => sourceLink(wit.value, props.loc, props.kwic))
</script>

<template>
  <span class="srccite">
    <AuthorBadge v-if="wit" :author="wit.author" :witness="w" />
    <template v-if="wit"> · </template>
    <RouterLink v-if="wit" class="srctitle" :to="witnessTo(w)">{{ wit.title }}</RouterLink><span v-else class="srctitle">{{ w }}</span><template v-if="ru"> <RuBadge :flag="ru" /></template>
    · <span class="srcloc"><span class="muted">локатор:</span> <RouterLink v-if="wit" :to="textTo(w, loc)">{{ loc }}</RouterLink><template v-else>{{ loc }}</template></span>
    <template v-if="date"> · {{ fmtDate(date) }}</template>
    <template v-if="link"> · <a class="srclink" :href="link.url" target="_blank" rel="noopener">оригінал ↗</a></template>
  </span>
</template>
