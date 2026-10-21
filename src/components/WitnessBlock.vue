<script setup lang="ts">
/**
 * SPEC 63 CP-2: the «Пам’ятки» panel of EVERY card kind: the same WitnessPanel (граф / список / типово switch of the full card, MM-4) inside a collapsible Panel.
 * Without any witness the panel is collapsed with an honest empty state («немає засвідчень у корпусі»); a graph needs ≥ 2 witnesses, with fewer only the list shows.
 */
import { computed } from 'vue'
import Panel from './Panel.vue'
import WitnessPanel from './WitnessPanel.vue'
const props = defineProps<{ items: { w: string; n: number }[]; id?: string; /** shown after the count, e.g. «рядків словників» */ unit?: string; emptyText?: string }>()
const summary = computed(() => `${props.items.length} пам’яток${props.unit ? ' · ' + props.unit : ''}`)
</script>

<template>
  <Panel :id="id ?? 'cp-wit'" :open="items.length > 0" :count="items.length" title="Пам’ятки · Witnesses" :summary="summary" :empty="!items.length" :empty-text="emptyText ?? 'немає засвідчень у корпусі'">
    <WitnessPanel :items="items" />
  </Panel>
</template>
