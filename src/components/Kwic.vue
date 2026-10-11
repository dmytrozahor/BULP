<script setup lang="ts">
/**
 * research/07 §3.1: «KWIC rows use the format left context | **node** | right context with a monospace-aligned node, and a citation line
 * underneath (author, title, year, region, link). Offer … a filter by period.» P-1.6: statistics link to the concordance lines.
 */
import { computed, ref } from 'vue'
import type { Kwic } from '../../core/types.ts'
import { assignEpoch } from '../../core/epochs.ts'
import { isKnown } from '../../core/evidence.ts'
import { epochShort, fmtDate } from '../lib/format.ts'
import { authorInfo, useData } from '../composables/useData.ts'
const props = defineProps<{ lines: Kwic[]; limit?: number }>()
const { witnessById } = useData()
const epochOf = (k: Kwic) => { const a = assignEpoch(k.date, 'shev'); return isKnown(a) ? a.value.epochs[0]! : 'unknown' }
const epochs = computed(() => [...new Set(props.lines.map(epochOf))])
const sel = ref(''), all = ref(false)
const shown = computed(() => props.lines.filter(k => !sel.value || epochOf(k) === sel.value).sort((a, b) => a.date[1] - b.date[1]))
const view = computed(() => (all.value ? shown.value : shown.value.slice(0, props.limit ?? 5)))
const cite = (k: Kwic) => { const w = witnessById.value.get(k.w); return { author: w ? authorInfo(w.author, w).name : '', title: w?.title ?? k.w, url: w?.url } }
</script>

<template>
  <div>
    <div v-if="epochs.length > 1" class="row sans small" role="group" aria-label="Фільтр за епохою">
      <button type="button" class="chip" :aria-pressed="!sel" @click="sel = ''">усі епохи</button>
      <button v-for="e in epochs" :key="e" type="button" class="chip" :aria-pressed="sel === e" @click="sel = e">{{ epochShort(e) }}</button>
    </div>
    <div v-for="(k, i) in view" :key="i" class="kwic">
      <span class="l"><span>{{ k.left }}</span></span><span class="n">{{ k.node }}</span><span class="r">{{ k.right }}</span>
      <span class="cite">{{ cite(k).author }} · <a v-if="cite(k).url" :href="cite(k).url" target="_blank" rel="noopener">{{ cite(k).title }}</a><template v-else>{{ cite(k).title }}</template> · {{ k.loc }} · {{ fmtDate(k.date) }}</span>
    </div>
    <p v-if="!view.length" class="muted">Прикладів немає.</p>
    <button v-if="shown.length > view.length" type="button" class="chip sans small" @click="all = true">більше… ({{ shown.length - view.length }})</button>
  </div>
</template>
