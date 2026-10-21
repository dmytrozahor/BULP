<script setup lang="ts">
/**
 * SPEC 63 MM-4: the «Пам’ятки» panel of light cards (неперевірена лема, незв’язане написання, archaic): the same graph / list / «типово» switch as the full card (FormView, panel «witnesses»);
 * with fewer than two known witnesses there is nothing to chart and only the list is shown.
 */
import { computed } from 'vue'
import { isKnown } from '../../core/evidence.ts'
import { useData } from '../composables/useData.ts'
import { epochShort, fmtDate } from '../lib/format.ts'
import { witnessTo } from '../lib/nav.ts'
import { showWitnessGraph, witnessPoints } from '../lib/witnessPoints.ts'
import ViewSwitch from './ViewSwitch.vue'
import AttestGraph from './AttestGraph.vue'
import RuBadge from './RuBadge.vue'
import { ruOfWitness } from '../../core/ru-source.ts'
const props = defineProps<{ items: { w: string; n: number }[] }>()
const { witnessById } = useData()
const wit = (id: string) => witnessById.value.get(id)
const ru = (id: string) => ruOfWitness(wit(id))   // SPEC 63 RU-3
const points = computed(() => witnessPoints(props.items, wit))
const graph = computed(() => showWitnessGraph(points.value))
const epochsOf = (id: string): string[] => { const e = wit(id)?.epochShev; return e && isKnown(e) ? e.value.epochs.map(epochShort) : [] }
</script>

<template>
  <ViewSwitch v-if="graph" panel="witnesses">
    <template #graph><AttestGraph :points="points" label="Хронологія пам’яток" /></template>
    <template #list>
      <ul><li v-for="o in items" :key="o.w"><RouterLink :to="witnessTo(o.w)">{{ wit(o.w)?.title ?? o.w }}</RouterLink><template v-if="wit(o.w)"> · {{ fmtDate(wit(o.w)!.date) }}</template>
        <template v-if="epochsOf(o.w).length"> · {{ epochsOf(o.w).join(' / ') }}</template><template v-if="ru(o.w)"> · <RuBadge :flag="ru(o.w)" /></template></li></ul>
    </template>
  </ViewSwitch>
  <ul v-else><li v-for="o in items" :key="o.w"><RouterLink :to="witnessTo(o.w)">{{ wit(o.w)?.title ?? o.w }}</RouterLink><template v-if="wit(o.w)"> · {{ fmtDate(wit(o.w)!.date) }}</template>
    <template v-if="epochsOf(o.w).length"> · {{ epochsOf(o.w).join(' / ') }}</template><template v-if="ru(o.w)"> · <RuBadge :flag="ru(o.w)" /></template></li></ul>
</template>