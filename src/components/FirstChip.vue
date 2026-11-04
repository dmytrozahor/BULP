<script setup lang="ts">
/**
 * SPEC 63 DB-2 — the main chip in a SEARCH row: «Волинь, 1566» (the region of the earliest reliable attestation). Loaded LAZILY, after the rows have rendered and the query has settled
 * (idle + 300 ms, cancelled when the row goes away): nothing is added to the keystroke path or to a core card. The space is reserved, so the row does not jump.
 * A hypothesis (one witness, or a region known only from the place of publication) is dashed and italic and its title says «гіпотеза»; a word with no reliable real region shows nothing.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { pickFirst, yearText, type FrEntry } from '../../core/first-region.ts'
import { hueOf } from '../../core/dialect-badge.ts'
import { markByKey, markKeyOf } from '../../core/coats.ts'
import { frLoaded, frPeek } from '../lib/firstData.ts'
import { useData } from '../composables/useData.ts'
const props = defineProps<{ lemma: string; /** test hook */ delay?: number; /** test hook: an entry instead of the lazy shard */ entryIn?: FrEntry; /** test hook: region names by code */ names?: Record<string, string> }>()
const { corpus } = useData()
const go = ref(props.entryIn !== undefined); let t: ReturnType<typeof setTimeout> | undefined
onMounted(() => { t = setTimeout(() => { go.value = true }, props.delay ?? 300) })
onBeforeUnmount(() => t && clearTimeout(t))
const name = (c: string) => props.names?.[c] ?? corpus.value?.regions?.find(r => r.code === c)?.name ?? c
const pick = computed(() => (go.value ? pickFirst(props.entryIn ?? frPeek(props.lemma), name) : undefined))
const settled = computed(() => go.value && frLoaded(props.lemma))
const hue = computed(() => { const m = pick.value?.main[0], k = m ? markKeyOf(m.c) : undefined; return hueOf(k ? markByKey[k]?.code : undefined) })
const text = computed(() => (pick.value ? pick.value.main.map(r => `${name(r.c)}, ${yearText(r)}`).join(' · ') + (pick.value.simul ? ' (одночасно)' : '') : ''))
const title = computed(() => (pick.value ? `${pick.value.thin ? 'гіпотеза: ' : ''}перша фіксація — ${text.value}. Регіон — місце, де пам’ятку написано чи надруковано, а не діалектна мітка слова.` : ''))
</script>

<template>
  <span :class="['frchip', 'sans', { thin: pick?.thin, ph: !pick }]" :style="{ '--dl': hue.light, '--dd': hue.dark }" data-testid="search-first" :data-state="pick ? 'chip' : settled ? 'none' : 'pending'" :title="title || undefined">
    <template v-if="pick">
      <svg class="fr-dot" viewBox="0 0 20 24" aria-hidden="true" focusable="false"><path d="M2 2h16v10c0 5.5-4 8.5-8 10.5C6 20.5 2 17.5 2 12z" /></svg>
      <span class="fr-t" data-testid="search-first-text">{{ pick.thin ? 'гіпотеза: ' : '' }}{{ text }}</span>
    </template>
  </span>
</template>
