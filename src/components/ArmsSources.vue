<script setup lang="ts">
/** SPEC 63 DB-1: «Джерела гербів» — file, Commons page, author and licence of every coat of arms the map shows (the attribution the licences ask for). Lists only the coats on view. */
import { computed } from 'vue'
import { markByKey } from '../../core/coats.ts'
import { useBadge } from '../lib/badge.ts'
import { coatIndex } from '../lib/coatsData.ts'
const props = defineProps<{ lemma: string }>()
const { chips } = useBadge(() => props.lemma)
const rows = computed(() => {
  const ids = new Set<string>(); for (const c of chips.value.slice(0, 3)) for (const k of c.marks) { const id = markByKey[k]?.coat; if (id && coatIndex.value?.[id]?.ok) ids.add(id) }
  return [...ids].map(id => coatIndex.value![id]!)
})
</script>

<template>
  <details v-if="rows.length" class="small sans arms-src" data-testid="arms-sources">
    <summary>Джерела гербів ({{ rows.length }})</summary>
    <ul><li v-for="r in rows" :key="r.id"><a :href="r.page" target="_blank" rel="noopener">{{ r.file }} ↗</a> — автор: {{ r.author }}; ліцензія: {{ r.licence }}<template v-if="r.licenceUrl"> (<a :href="r.licenceUrl" target="_blank" rel="noopener">текст ↗</a>)</template>. Wikimedia Commons.</li></ul>
    <p class="muted">Герб області показано для історичного регіону лише там, де регіон збігається з областю; інакше — простий позначник без герба.</p>
  </details>
</template>
