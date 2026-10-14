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
      <svg v-if="g.plates.length" class="tgraph" role="group" :aria-label="label ?? 'Хронологія'" :viewBox="`0 0 ${g.width} ${g.height}`" :width="g.width" :height="g.height">
        <defs><marker id="tg-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="g-arrow" /></marker></defs>
        <path v-for="a in g.arrows" :key="a.from + a.to" :d="a.d" class="g-link" marker-end="url(#tg-arr)" />
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
