<script setup lang="ts">
/**
 * research/07 §3.1: «KWIC rows use the format left context | **node** | right context with a monospace-aligned node, and a citation line
 * underneath (author, title, year, region, link). Offer … a filter by period.» P-1.6: statistics link to the concordance lines.
 */
import { computed, ref } from 'vue'
import type { Kwic } from '../../core/types.ts'
import { assignEpoch } from '../../core/epochs.ts'
import { isKnown } from '../../core/evidence.ts'
import { epochShort } from '../lib/format.ts'
import SourceCite from './SourceCite.vue'
import MediaPanel from './MediaPanel.vue'
import { hasMedia, resolveMedia } from '../lib/sophiaData.ts'
import type { WitnessMedia } from '../lib/media.ts'
import { useData } from '../composables/useData.ts'
const { witnessById } = useData()
const wm = (w: string) => witnessById.value.get(w) as { media?: WitnessMedia } | undefined
const mediaOpen = ref<number>(), media = ref<WitnessMedia>(), mediaErr = ref(false)   // MV-1: «переглянути» opens the media panel under the row
const showMedia = async (i: number, w: string) => {
  if (mediaOpen.value === i) { mediaOpen.value = undefined; return }
  mediaErr.value = false; media.value = undefined; mediaOpen.value = i
  try { media.value = await resolveMedia(w, wm(w)) } catch { mediaErr.value = true }
}
const props = defineProps<{ lines: Kwic[]; limit?: number }>()
const epochOf = (k: Kwic) => { const a = assignEpoch(k.date, 'shev'); return isKnown(a) ? a.value.epochs[0]! : 'unknown' }
const epochs = computed(() => [...new Set(props.lines.map(epochOf))])
const sel = ref(''), all = ref(false)
const shown = computed(() => props.lines.filter(k => !sel.value || epochOf(k) === sel.value).sort((a, b) => a.date[1] - b.date[1]))
const view = computed(() => (all.value ? shown.value : shown.value.slice(0, props.limit ?? 5)))
</script>

<template>
  <div>
    <div v-if="epochs.length > 1" class="row sans small" role="group" aria-label="Фільтр за епохою">
      <button type="button" class="chip" :aria-pressed="!sel" @click="sel = ''">усі епохи</button>
      <button v-for="e in epochs" :key="e" type="button" class="chip" :aria-pressed="sel === e" @click="sel = e">{{ epochShort(e) }}</button>
    </div>
    <div v-for="(k, i) in view" :key="i" class="kwic">
      <span class="l"><span>{{ k.left }}</span></span>{{ ' ' }}<span class="n">{{ k.node }}</span>{{ ' ' }}<span class="r">{{ k.right }}</span>
      <span class="cite"><SourceCite :w="k.w" :loc="k.loc" :date="k.date" :kwic="k" />
        <template v-if="hasMedia(k.w, wm(k.w))"> · <button type="button" class="chip small" :aria-expanded="mediaOpen === i" @click="showMedia(i, k.w)">переглянути</button></template></span>
      <template v-if="mediaOpen === i">
        <MediaPanel v-if="media" :media="media" :refs="[witnessById.get(k.w)?.url, k.w]" @close="mediaOpen = undefined" />
        <p v-else class="muted small sans" role="status">{{ mediaErr ? 'Медіа недоступне.' : 'Завантаження…' }}</p>
      </template>
    </div>
    <p v-if="!view.length" class="muted">Прикладів немає.</p>
    <button v-if="shown.length > view.length" type="button" class="chip sans small" @click="all = true">більше… ({{ shown.length - view.length }})</button>
  </div>
</template>
