<script setup lang="ts">
/**
 * SPEC 63 SL / CV: the Plast sense of a word on its word card (user 2026-10-15: «for plast include the senses, all words must have cards»). The gloss is the sense, quoted with source and
 * locator; abbreviations show their expansion; further senses the word already has (uk.wiktionary, senses.json) follow. Lookup is case-insensitive and tolerant of the source's
 * quirks (stress capitals «ВИшкіл», a Latin B in «BЮВ»); the source spelling is shown as written. Renders nothing when the word is not in the Plast vocabulary.
 */
import { computed } from 'vue'
import { plastLabel, plastOf } from '../../core/sociolect.ts'
import { key } from '../../core/text.ts'
import { loadSociolect, sociolectFile } from '../lib/sociolectData.ts'
import { sensesOf } from '../lib/sensesData.ts'
const props = defineProps<{ word: string }>()
loadSociolect()
const rows = computed(() => { const f = sociolectFile.value; return f ? plastOf(props.word, f).map(e => ({ ...e, src: e.s ?? f.plast.source })) : [] })
const others = computed(() => sensesOf(key(props.word)).slice(0, 4))
</script>

<template>
  <section v-if="rows.length" class="plast-senses" data-testid="plast-senses">
    <h2>Значення (Пласт)</h2>
    <ul class="sans small">
      <li v-for="e in rows" :key="e.src + e.loc + e.w">
        <span class="badge">{{ plastLabel(e) }}</span>
        <b> {{ e.w }}</b><template v-if="e.k === 'abbr'"> — розшифровка: </template><template v-else> — </template>«{{ e.g }}»
        <span class="muted"> · <RouterLink :to="`/source/${encodeURIComponent(e.src)}`">джерело</RouterLink>, {{ e.loc }}</span>
      </li>
    </ul>
    <template v-if="others.length">
      <h3 class="small">Інші значення</h3>
      <ul class="sans small"><li v-for="(s, i) in others" :key="i">{{ s.gloss }}</li></ul>
    </template>
  </section>
</template>
