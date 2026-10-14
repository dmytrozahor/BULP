<script setup lang="ts">
/**
 * SPEC 63 UI-2: chronology as a graph of plates — one rounded plate per attestation (form + year), arrows point from each plate to the next-attested one
 * (what precedes what). x is a compressed time axis, plates never overlap (lanes), border weight ∝ √f, colour by kind (theme tokens).
 * Every plate is a link (same target as the list). Scrolls horizontally on a narrow screen; the legend is HTML, so it is never clipped.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { timelineLayout, PLATE_KIND_UK, type TPoint } from '../lib/graphLayout.ts'
const props = defineProps<{ points: (TPoint & { when?: string })[]; label?: string }>()
const router = useRouter()
const g = computed(() => timelineLayout(props.points))
const href = (to: string) => router.resolve(to).href
const kinds = computed(() => [...new Set(props.points.map(p => p.kind))])
</script>

<template>
  <div>
    <div class="gscroll">
      <svg v-if="g.plates.length" class="tgraph" role="group" :aria-label="label ?? 'Хронологія'" :viewBox="g.viewBox" :width="g.width" :height="g.height">
        <defs><marker id="tg-arr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0 0 10 5 0 10z" class="g-arrow g-arrow-ink" /></marker></defs>
        <g class="g-axisg"><line x1="0" :x2="g.width" :y1="g.axisY" :y2="g.axisY" class="g-axis" />
          <g v-for="t in g.ticks" :key="t.label"><line :x1="t.x" :x2="t.x" :y1="g.axisY" :y2="g.axisY + 5" class="g-axis" /><text :x="t.x" :y="g.axisY + 17" text-anchor="middle" class="g-date">{{ t.label }}</text></g></g>
        <g v-for="a in g.arrows" :key="a.from + a.to"><path :d="a.d" class="g-link" marker-end="url(#tg-arr)" /><text v-if="a.dy" :x="a.mx" :y="a.my" text-anchor="middle" class="g-date g-dy">{{ a.dy }}</text></g>
        <a v-for="d in g.plates" :key="d.id" class="g-plate" :data-kind="d.kind" :href="href(d.to)" @click.prevent="router.push(d.to)">
          <title>{{ d.title ?? d.label }} · {{ d.when }} · f = {{ d.f }}</title>
          <rect :x="d.x" :y="d.y" :width="d.w" :height="d.h" rx="12" :stroke-width="d.sw" />
          <text :x="d.x + d.w / 2" :y="d.y + 17" text-anchor="middle" :class="['g-label', 'lang', { old: d.kind === 'old' }]">{{ d.label }}</text>
          <text :x="d.x + d.w / 2" :y="d.y + 31" text-anchor="middle" class="g-date">{{ d.when }}</text>
        </a>
      </svg>
      <p v-else class="small muted">немає датованих свідчень</p>
    </div>
    <p v-if="kinds.length" class="small sans muted gleg">стрілка: від раніше засвідченого до пізнішого · товщина рамки ∝ √f<template v-if="kinds.length > 1"> ·
      <span v-for="k in kinds" :key="k" class="gleg-i"><span class="gleg-dot" :data-kind="k" aria-hidden="true" /> {{ PLATE_KIND_UK[k] ?? k }}</span></template></p>
  </div>
</template>
