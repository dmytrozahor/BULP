<script setup lang="ts">
/**
 * MM-23 (owner: «тоненький теж має лінкуватися до тонкий»): on a diminutive / endearing / augmentative / intensive derivative: «зменшено-пестливе до тонкий» with the dictionary quote as the source;
 * on the base: its derivatives grouped by relation. Data: lm/dim (СУМ-11 / СУМ-20 gloss «Зменш.-пестл. до …», en.wiktionary «diminutive of …»). Renders nothing for a word without such a link.
 */
import { computed, ref, watch } from 'vue'
import { DIM_GROUP_UK, DIM_REL_UK, type DimEntry, type DimRel } from '../../core/dim-links.ts'
import { DIM_SRC_UK, dimOf } from '../lib/dimData.ts'
const props = defineProps<{ lemma: string }>()
const entry = ref<DimEntry>()
watch(() => props.lemma, l => { entry.value = undefined; dimOf(l).then(e => { if (l === props.lemma) entry.value = e }) }, { immediate: true })
const wl = (l: string) => '/w/' + encodeURIComponent(l)
const groups = computed(() => {
  const g = new Map<DimRel, string[]>()
  for (const [d, rel] of entry.value?.ds ?? []) { const a = g.get(rel) ?? g.set(rel, []).get(rel)!; if (!a.includes(d)) a.push(d) }
  return [...g]
})
</script>

<template>
  <div v-if="entry?.of?.length || entry?.ds?.length" data-testid="dim-line">
    <p v-for="o in entry.of ?? []" :key="o[0] + o[2]" class="hl-line sans small" data-testid="dim-of">
      <span class="badge">{{ DIM_REL_UK[o[1]] }}</span> до <RouterLink :to="wl(o[0])"><strong>{{ o[0] }}</strong></RouterLink>
      <span class="muted"> · {{ DIM_SRC_UK[o[2]] }}<template v-if="o[4]"> · {{ o[4] }}</template> · «{{ o[3] }}»</span></p>
    <p v-for="[rel, ds] in groups" :key="rel" class="hl-line sans small" data-testid="dim-ds">
      <span class="muted">{{ DIM_GROUP_UK[rel] }}: </span>
      <template v-for="(d, i) in ds.slice(0, 12)" :key="d"><template v-if="i">, </template><RouterLink :to="wl(d)">{{ d }}</RouterLink></template><span v-if="ds.length > 12" class="muted"> … +{{ ds.length - 12 }}</span></p>
  </div>
</template>
