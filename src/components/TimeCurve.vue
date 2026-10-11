<script setup lang="ts">
/**
 * research/07 §3.2 «Verlaufskurve»: "Line chart, smoothed line over faint raw bars … shade sparse slices where N_t is small".
 * Smoothing = centred moving average, window 1 (SPEC 10 M-5.6). Denominators (N per century) are in the table below (P-1.6).
 */
import { computed } from 'vue'
import type { LemmaStats } from '../../core/types.ts'
import { centuryLabel, centuryOf, fmtNum, roman } from '../lib/format.ts'
import { STAT_CITES } from '../../core/stats.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ series: LemmaStats['byCentury']; sizes: Record<string, number>; sparse?: number }>()
const W = 340, H = 170, L = 36, B = 22, T = 8, R = 6
const rows = computed(() => [...props.series].sort((a, b) => a.c - b.c).map(s => ({ ...s, N: props.sizes[String(s.c)] ?? 0 })))
const max = computed(() => Math.max(1e-9, ...rows.value.map(r => Math.max(r.ipm, r.smooth ?? 0))))
const bw = computed(() => (W - L - R) / Math.max(1, rows.value.length))
const x = (i: number) => L + bw.value * (i + 0.5)
const y = (v: number) => T + (H - T - B) * (1 - v / max.value)
const line = computed(() => rows.value.map((r, i) => (r.smooth == null ? '' : `${x(i)},${y(r.smooth)}`)).filter(Boolean).join(' '))
const isSparse = (n: number) => n < (props.sparse ?? 30000)
const ticks = computed(() => [0, max.value / 2, max.value])
</script>

<template>
  <div>
    <svg class="chart" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Частота за століттями (ipm), згладжена лінія поверх сирих стовпчиків">
      <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="none" /><line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" stroke-width="1.2" style="color:var(--muted)" /></pattern></defs>
      <g v-for="t in ticks" :key="t"><line class="grid" :x1="L" :x2="W - R" :y1="y(t)" :y2="y(t)" /><text :x="L - 4" :y="y(t) + 3" text-anchor="end">{{ fmtNum(t, t < 10 ? 1 : 0) }}</text></g>
      <line class="axis" :x1="L" :x2="W - R" :y1="H - B" :y2="H - B" />
      <g v-for="(r, i) in rows" :key="r.c">
        <rect :x="x(i) - bw * 0.36" :y="y(r.ipm)" :width="bw * 0.72" :height="H - B - y(r.ipm)" :fill="isSparse(r.N) ? 'url(#hatch)' : 'var(--accent)'" :opacity="isSparse(r.N) ? 0.9 : 0.22" stroke="var(--muted)" stroke-width=".4">
          <title>{{ centuryLabel(r.c) }}: f={{ r.f }}, N={{ fmtNum(r.N) }}, {{ fmtNum(r.ipm, 1) }} ipm{{ isSparse(r.N) ? ' — мало даних (N < ' + fmtNum(sparse ?? 30000) + ')' : '' }}</title>
        </rect>
        <text :x="x(i)" :y="H - 8" text-anchor="middle">{{ roman(centuryOf(r.c)) }}</text>
      </g>
      <polyline v-if="line" :points="line" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" />
      <circle v-for="(r, i) in rows" :key="'c' + r.c" v-show="r.smooth != null" :cx="x(i)" :cy="y(r.smooth ?? 0)" r="2.4" fill="var(--accent)" />
      <text x="2" y="9" text-anchor="start">ipm</text>
      <text :x="W - R" :y="H - 1" text-anchor="end" style="font-size:8px">століття</text>
    </svg>
    <p class="small muted">ipm — на мільйон слів; лінія — згладжене (вікно 1), стовпчики — сирі; <span style="border-bottom:2px dotted var(--muted)">штриховка</span> — зрізи з малим N (&lt; {{ fmtNum(sparse ?? 30000) }} слів).
      <EvidencePopover :evidence="[STAT_CITES.ipm!, STAT_CITES.smooth!]" heading="ipm і згладжування"><span class="badge">ⓘ</span></EvidencePopover></p>
    <details class="small sans"><summary>Дані й знаменники</summary>
      <table><thead><tr><th>ст.</th><th class="num">f</th><th class="num">N слів</th><th class="num">ipm</th></tr></thead>
        <tbody><tr v-for="r in rows" :key="r.c"><td>{{ centuryLabel(r.c) }}</td><td class="num">{{ r.f }}</td><td class="num">{{ fmtNum(r.N) }}</td><td class="num">{{ fmtNum(r.ipm, 1) }}</td></tr></tbody></table>
    </details>
  </div>
</template>
