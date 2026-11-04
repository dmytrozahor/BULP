<script setup lang="ts">
/** SPEC 63 OV-12 / DB-1b: region distribution as compact bars, ipm = f / N of the region's witnesses (N in the tooltip). A witness region, not a dialect label (SPEC 20 B-3.6).
 *  Layout: label (wraps) · bar (shrinks) · number (own right-aligned tabular column), so a long label or a large value can never leave the block. A region with fewer than REGION_MIN_N words is greyed: «мала вибірка». */
import { computed } from 'vue'
import type { LemmaCard } from '../../core/types.ts'
import { useData } from '../composables/useData.ts'
import { fmtNum } from '../lib/format.ts'
import { barRows, LOW_N_NOTE, MIN_N_RULE } from '../lib/regionBars.ts'
const props = defineProps<{ by?: LemmaCard['stats']['byRegion']; /** names by code (tests); default = the corpus regions */ names?: Record<string, string> }>()
const { corpus } = useData()
const rows = computed(() => barRows(props.by, c => props.names?.[c] ?? corpus.value?.regions?.find(x => x.code === c)?.name ?? c))
const anyLow = computed(() => rows.value.some(r => r.low))
</script>

<template>
  <ul v-if="rows.length" class="regbars small sans" data-testid="region-bars" aria-label="Розподіл за регіонами пам’яток (ipm на N слів регіону)">
    <li v-for="r in rows" :key="r.code" :class="{ low: r.low }" :data-low="r.low ? '1' : undefined" :title="`${r.name}: f = ${r.f}, N = ${fmtNum(r.N)}, ${fmtNum(r.ipm, 1)} ipm${r.low ? ' — ' + LOW_N_NOTE(r.N) : ''}`">
      <span class="rb-n">{{ r.name }}<em v-if="r.low" class="rb-low" data-testid="rb-low">{{ LOW_N_NOTE(r.N) }}</em></span>
      <span class="rb-bar" aria-hidden="true"><i :style="{ width: r.w + '%' }" /></span><span class="rb-v">{{ r.shown }}</span>
    </li>
    <li v-if="anyLow" class="rb-rule muted" data-testid="rb-rule">{{ MIN_N_RULE }}</li>
  </ul>
  <p v-else class="small sans muted">регіон пам’яток невідомий (немає даних; перевірено: регіони пам’яток, у яких це слово засвідчене)</p>
</template>
