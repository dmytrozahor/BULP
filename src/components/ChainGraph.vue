<script setup lang="ts">
/**
 * SPEC 63 UI-2: derivation chain as a directed graph — stages are nodes (click → the form page, tooltip = date), rules are labelled edges
 * (click → the same step evidence the list opens). Plain SVG on theme tokens; scrolls horizontally on a narrow screen.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { TraceStep } from '../../core/types.ts'
import { ruleById } from '../../core/phonology.ts'
import { chainLayout } from '../lib/graphLayout.ts'
import { formTo } from '../lib/nav.ts'
const props = defineProps<{ steps: TraceStep[]; dates?: Record<string, string>; open?: number | null; lemma?: string }>()
const emit = defineEmits<{ select: [i: number] }>()
const router = useRouter()
const g = computed(() => chainLayout(props.steps, props.dates))
const go = (form: string) => router.push(formTo(form, props.lemma))
const href = (form: string) => router.resolve(formTo(form, props.lemma)).href
</script>

<template>
  <div class="gscroll">
    <svg v-if="g.nodes.length" class="cgraph" role="group" aria-label="Граф виведення" :viewBox="`0 0 ${g.width} ${g.height}`" :width="g.width" :height="g.height">
      <defs><marker id="cg-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="g-arrow" /></marker></defs>
      <g v-for="e in g.edges" :key="'e' + e.i" class="g-edge" role="button" tabindex="0" :aria-pressed="open === e.i" :aria-label="`правило ${e.rule} ${ruleById[e.rule]?.name ?? ''}`"
        @click="emit('select', e.i)" @keydown.enter="emit('select', e.i)">
        <title>{{ e.rule }} {{ ruleById[e.rule]?.name }}</title>
        <line :x1="e.x1" :x2="e.x2 - 1" y1="32" y2="32" marker-end="url(#cg-arr)" />
        <text :x="(e.x1 + e.x2) / 2" y="24" text-anchor="middle" class="g-rule">{{ e.label }}</text>
      </g>
      <a v-for="n in g.nodes" :key="n.id" class="g-node" :href="href(n.label)" @click.prevent="go(n.label)">
        <title>{{ n.label }}{{ n.date ? ' · ' + n.date : '' }}</title>
        <rect :x="n.x" y="16" :width="n.w" height="32" rx="6" />
        <text :x="n.cx" y="37" text-anchor="middle" class="g-label lang">{{ n.label }}</text>
        <text v-if="n.date" :x="n.cx" y="62" text-anchor="middle" class="g-date">{{ n.date }}</text>
      </a>
    </svg>
    <p v-else class="small muted">змін немає</p>
  </div>
</template>
