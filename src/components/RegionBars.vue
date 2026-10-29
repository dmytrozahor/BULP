<script setup lang="ts">
/** SPEC 63 OV-12: region distribution as compact bars, ipm = f / N of the region's witnesses (N in the tooltip). A witness region, not a dialect label (SPEC 20 B-3.6). */
import { computed } from 'vue'
import type { LemmaCard } from '../../core/types.ts'
import { useData } from '../composables/useData.ts'
import { fmtNum } from '../lib/format.ts'
const props = defineProps<{ by?: LemmaCard['stats']['byRegion'] }>()
const { corpus } = useData()
const rows = computed(() => (props.by ?? []).filter(r => r.N > 0 && r.f > 0).map(r => ({ ...r, name: corpus.value?.regions.find(x => x.code === r.code)?.name ?? r.code, ipm: (r.f / r.N) * 1e6 })).sort((a, b) => b.ipm - a.ipm).slice(0, 6))
const max = computed(() => Math.max(1e-9, ...rows.value.map(r => r.ipm)))
</script>

<template>
  <ul v-if="rows.length" class="regbars small sans" data-testid="region-bars" aria-label="Розподіл за регіонами пам’яток (ipm на N слів регіону)">
    <li v-for="r in rows" :key="r.code" :title="`${r.name}: f = ${r.f}, N = ${fmtNum(r.N)}, ${fmtNum(r.ipm, 1)} ipm`"><span class="rb-n">{{ r.name }}</span><span class="rb-bar"><i :style="{ width: (r.ipm / max) * 100 + '%' }" /></span><span class="rb-v">{{ fmtNum(r.ipm, 1) }}</span></li>
  </ul>
  <p v-else class="small sans muted">регіон пам’яток невідомий (немає даних; перевірено: регіони пам’яток, у яких це слово засвідчене)</p>
</template>
