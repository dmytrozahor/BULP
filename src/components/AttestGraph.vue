<script setup lang="ts">
/**
 * SPEC 63 UI-2: chronology as a timeline graph — one dot per attestation (spelling, witness or epoch), x = year, radius ∝ √f, colour by kind
 * (theme tokens). Every dot is a link (same target as the list). Scrolls horizontally on a narrow screen.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { timelineLayout, type TPoint } from '../lib/graphLayout.ts'
const props = defineProps<{ points: TPoint[]; label?: string }>()
const router = useRouter()
const g = computed(() => timelineLayout(props.points))
const href = (to: string) => router.resolve(to).href
const kinds = computed(() => [...new Set(props.points.map(p => p.kind))])
</script>

<template>
  <div class="gscroll">
    <svg v-if="g.dots.length" class="tgraph" role="group" :aria-label="label ?? 'Хронологія'" :viewBox="`0 0 ${g.width} ${g.height}`" :width="g.width" :height="g.height">
      <line x1="0" :x2="g.width" :y1="g.height - 14" :y2="g.height - 14" class="g-axis" />
      <g v-for="t in g.ticks" :key="t.x"><line :x1="t.x" :x2="t.x" :y1="g.height - 18" :y2="g.height - 10" class="g-axis" /><text :x="t.x" :y="g.height - 1" text-anchor="middle" class="g-date">{{ t.label }}</text></g>
      <a v-for="d in g.dots" :key="d.id" class="g-dot" :data-kind="d.kind" :href="href(d.to)" @click.prevent="router.push(d.to)">
        <title>{{ d.title ?? d.label }} · f = {{ d.f }}</title>
        <circle :cx="d.cx" :cy="d.cy" :r="d.r" />
        <text :x="d.cx" :y="d.cy - d.r - 3" text-anchor="middle" class="g-label lang">{{ d.label }}</text>
      </a>
    </svg>
    <p v-else class="small muted">немає датованих свідчень</p>
    <p v-if="kinds.length > 1" class="small sans muted gleg"><span v-for="k in kinds" :key="k" class="gleg-i"><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" class="g-dot" :data-kind="k" /></svg> {{ k }}</span> · радіус ∝ √f</p>
  </div>
</template>
