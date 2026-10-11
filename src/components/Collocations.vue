<script setup lang="ts">
/** research/07 §3.1: «Typische сполучення: … Font size scales linearly with logDice, clamped to 0–14. A table view lists f_xy, logDice». cloud ⇄ table toggle. */
import { ref } from 'vue'
import type { LemmaStats } from '../../core/types.ts'
import { STAT_CITES } from '../../core/stats.ts'
import { fmtNum } from '../lib/format.ts'
import EvidencePopover from './EvidencePopover.vue'
defineProps<{ colloc: LemmaStats['colloc'] }>()
const mode = ref<'cloud' | 'table'>('cloud')
const size = (d: number) => (0.85 + (Math.max(0, Math.min(14, d)) / 14) * 1.0).toFixed(2) + 'rem'
</script>
<template>
  <div v-if="!colloc.length" class="muted small">Недостатньо даних (f<sub>xy</sub> ≥ 3 і logDice &gt; 0).</div>
  <div v-else>
    <div class="row sans small" role="group" aria-label="Вигляд">
      <button class="chip" type="button" :aria-pressed="mode === 'cloud'" @click="mode = 'cloud'">хмара</button>
      <button class="chip" type="button" :aria-pressed="mode === 'table'" @click="mode = 'table'">таблиця</button>
      <EvidencePopover :evidence="[STAT_CITES.logDice!]" heading="logDice" meta="Rychlý 2008"><span class="badge">logDice ⓘ</span></EvidencePopover>
    </div>
    <div v-if="mode === 'cloud'" class="cloud" style="margin-top:.5rem">
      <RouterLink v-for="c in colloc" :key="c.lemma" :to="`/w/${encodeURIComponent(c.lemma)}`" :style="{ fontSize: size(c.logDice) }" :title="`f=${c.fxy}, logDice=${fmtNum(c.logDice, 2)}`">{{ c.lemma }}</RouterLink>
    </div>
    <div v-else class="tablewrap"><table><thead><tr><th>партнер</th><th class="num">f<sub>xy</sub></th><th class="num">logDice</th></tr></thead>
      <tbody><tr v-for="c in colloc" :key="c.lemma"><td><RouterLink :to="`/w/${encodeURIComponent(c.lemma)}`">{{ c.lemma }}</RouterLink></td><td class="num">{{ c.fxy }}</td><td class="num">{{ fmtNum(c.logDice, 2) }}</td></tr></tbody></table></div>
  </div>
</template>
