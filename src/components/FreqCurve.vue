<script setup lang="ts">
/**
 * SPEC 63 OV-12: compact frequency-over-time curve (DWDS «Wortverlaufskurve»). Per-century normalisation f / N_century (ipm); a century the corpus does not cover is a hatched GAP and breaks
 * the line (no smoothing across it, nothing invented); sparse slices (N below `sparse`) are marked. Colours are theme tokens, so it works in light and dark; the chart has a text alternative.
 */
import { computed } from 'vue'
import type { LemmaStats } from '../../core/types.ts'
import { curvePoints, curveSegments } from '../lib/overview.ts'
import { centuryLabel, fmtNum, roman } from '../lib/format.ts'
const props = defineProps<{ series: LemmaStats['byCentury']; sizes: Record<string, number>; sparse?: number }>()
const W = 300, H = 120, L = 30, B = 18, T = 6, R = 4
const pts = computed(() => curvePoints(props.series, props.sizes))
const segs = computed(() => curveSegments(pts.value))
const max = computed(() => Math.max(1e-9, ...pts.value.map(p => p.ipm ?? 0)))
const bw = computed(() => (W - L - R) / Math.max(1, pts.value.length))
const x = (i: number) => L + bw.value * (i + 0.5)
const y = (v: number) => T + (H - T - B) * (1 - v / max.value)
const idx = (c: number) => pts.value.findIndex(p => p.c === c)
const thin = (n: number) => n < (props.sparse ?? 30000)
const alt = computed(() => `Частота за століттями, ipm на N століття: ${pts.value.map(p => `${roman(p.c)} ст. — ${p.gap ? 'немає корпусу' : fmtNum(p.ipm!, 1)}`).join('; ')}`)
</script>

<template>
  <div class="freqcurve" data-testid="freq-curve">
    <svg v-if="pts.length" class="chart" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="alt">
      <defs><pattern id="fc-gap" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="var(--muted)" stroke-width="1" /></pattern></defs>
      <line class="axis" :x1="L" :x2="W - R" :y1="H - B" :y2="H - B" />
      <text x="2" y="9" text-anchor="start">ipm</text><text :x="L - 3" :y="y(max) + 3" text-anchor="end">{{ fmtNum(max, max < 10 ? 1 : 0) }}</text>
      <g v-for="(p, i) in pts" :key="p.c">
        <rect v-if="p.gap" :x="x(i) - bw * 0.45" :y="T" :width="bw * 0.9" :height="H - T - B" fill="url(#fc-gap)" opacity=".35" data-gap="1"><title>{{ centuryLabel(p.c) }}: у корпусі немає пам’яток цього століття (N = 0), даних немає</title></rect>
        <rect v-else :x="x(i) - bw * 0.36" :y="y(p.ipm!)" :width="bw * 0.72" :height="H - B - y(p.ipm!)" fill="var(--accent)" :opacity="thin(p.N) ? 0.35 : 0.6" data-bar="1">
          <title>{{ centuryLabel(p.c) }}: f = {{ p.f }}, N = {{ fmtNum(p.N) }}, {{ fmtNum(p.ipm!, 1) }} ipm{{ thin(p.N) ? ' · мало даних' : '' }}</title></rect>
        <text :x="x(i)" :y="H - 5" text-anchor="middle">{{ roman(p.c) }}</text>
      </g>
      <polyline v-for="(s, k) in segs" :key="k" v-show="s.length > 1" :points="s.map(p => `${x(idx(p.c))},${y(p.ipm!)}`).join(' ')" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round" data-seg="1" />
    </svg>
    <p v-else class="small sans muted">кривої немає: корпус не охоплює століть цього слова</p>
    <p class="small sans muted">ipm = f / N століття · 10⁶: N — слова пам’яток саме цього століття (повний текст, без лише-словникових лічильників); штриховка — століття без корпусу (прогалина, не нуль; лінія перервана); блідий стовпчик — мало даних.</p>
  </div>
</template>
