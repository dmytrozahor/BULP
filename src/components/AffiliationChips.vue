<script setup lang="ts">
/** MV-2 (U-9): «джерело/проєкт» — links to the Ukrainian culture projects a source belongs to (Sophia portal, Polyphony, Wikisource, izbornyk), matched by URL host or Sophia witness id. */
import { computed } from 'vue'
import { affiliationsFor } from '../lib/media.ts'
const props = defineProps<{ refs?: (string | undefined)[]; all?: boolean }>()
import { AFFILIATIONS } from '../lib/media.ts'
const list = computed(() => (props.all ? AFFILIATIONS : affiliationsFor(...(props.refs ?? []))))
</script>

<template>
  <span v-if="list.length" class="affil sans small" role="group" aria-label="джерело/проєкт">
    <span class="muted">джерело/проєкт:</span>
    <a v-for="a in list" :key="a.id" class="chip" :href="a.url" target="_blank" rel="noopener" :data-affil="a.id">{{ a.label }} ↗</a>
  </span>
</template>

<style scoped>
.affil { display: inline-flex; flex-wrap: wrap; gap: .3rem .5rem; align-items: baseline; }
.affil a.chip { text-decoration: none; }
</style>
