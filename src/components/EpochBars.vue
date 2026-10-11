<script setup lang="ts">
/**
 * research/07 §3.2 «Period comparison»: "Horizontal bars of ipm per period. Mark bars that are significant against the previous period
 * (G² ≥ 3.84) and label them with Log Ratio." Both epoch schemes are shown separately — "Never merge the two schemes" (research/09 §4).
 * Colours: ordered sequential ramp per scheme (epochs are ordered, not categorical).
 */
import { computed } from 'vue'
import type { LemmaStats } from '../../core/types.ts'
import { EPOCHS } from '../../core/epochs.ts'
import { STAT_CITES } from '../../core/stats.ts'
import { epochShort, fmtNum, stars } from '../lib/format.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ stats: LemmaStats; sizes: Record<string, number> }>()
const groups = computed(() => (['shev', 'wl'] as const).map(sc => {
  const eps = EPOCHS.filter(e => e.scheme === sc && !e.overlay && props.sizes[e.id])
  const max = Math.max(1e-9, ...eps.map(e => props.stats.byEpoch[e.id]?.ipm ?? 0))
  return { sc, title: sc === 'shev' ? 'Шевельов (фонологічна періодизація)' : 'Історія літературної мови (WL)', rows: eps.map((e, i) => {
    const b = props.stats.byEpoch[e.id], sh = props.stats.shifts.find(s => s.b === e.id)
    return { id: e.id, name: epochShort(e.id), ipm: b?.ipm ?? 0, f: b?.f ?? 0, N: props.sizes[e.id]!, w: ((b?.ipm ?? 0) / max) * 100, ramp: `var(--ep${sc === 'shev' ? i + 1 : [2, 4, 6][i] ?? 6})`, sh }
  }) }
}))
</script>

<template>
  <div v-for="g in groups" :key="g.sc" style="margin-bottom:.8rem">
    <h3 class="small sans muted">{{ g.title }}</h3>
    <div v-for="r in g.rows" :key="r.id" style="margin:.35rem 0">
      <div class="row small sans" style="justify-content:space-between"><span>{{ r.name }}</span>
        <span :title="`f=${r.f}, N=${fmtNum(r.N)}`">{{ fmtNum(r.ipm, 1) }} ipm<span class="muted"> (f={{ r.f }}; N={{ fmtNum(r.N) }})</span></span></div>
      <div class="bar" role="img" :aria-label="`${r.name}: ${fmtNum(r.ipm, 1)} ipm`"><i :style="{ width: r.w + '%', background: r.ramp }"></i></div>
      <div v-if="r.sh && stars(r.sh.p)" class="small sans" :title="`G² = ${fmtNum(r.sh.g2, 1)}, p ≤ ${r.sh.p}`">
        <span aria-label="статистично значущо">{{ stars(r.sh.p) }}</span> Log Ratio {{ r.sh.logRatio > 0 ? '+' : '' }}{{ fmtNum(r.sh.logRatio, 2) }} проти попередньої
        <span class="muted">(G²={{ fmtNum(r.sh.g2, 1) }})</span></div>
      <div v-else-if="r.sh" class="small sans muted">різниця з попередньою незначуща (G²={{ fmtNum(r.sh.g2, 1) }})</div>
    </div>
  </div>
  <p class="small muted">★ p&lt;.05 · ★★ p&lt;.01 · ★★★ p&lt;.001 · ★★★★ p&lt;.0001 (G², UCREL). Log Ratio — ефект: +1 означає вдвічі частіше.
    <EvidencePopover :evidence="[STAT_CITES.g2!]" heading="G² (log-likelihood)"><span class="badge">ⓘ</span></EvidencePopover></p>
</template>
