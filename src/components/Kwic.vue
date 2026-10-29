<script setup lang="ts">
import { isOldForm } from '../lib/nav.ts'
/**
 * research/07 §3.1: «KWIC rows use the format left context | **node** | right context with a monospace-aligned node, and a citation line
 * underneath (author, title, year, region, link). Offer … a filter by period.» P-1.6: statistics link to the concordance lines.
 */
import { computed, ref, watch } from 'vue'
import { KWIC_PAGE, pageCount, pageSlice } from '../lib/page.ts'
import Pagination from './Pagination.vue'
import type { Kwic } from '../../core/types.ts'
import { assignEpoch } from '../../core/epochs.ts'
import { isKnown } from '../../core/evidence.ts'
import { epochShort } from '../lib/format.ts'
import SourceCite from './SourceCite.vue'
import MentionText from './MentionText.vue'
import MediaPanel from './MediaPanel.vue'
import { hasMedia, resolveMedia } from '../lib/sophiaData.ts'
import type { WitnessMedia } from '../lib/media.ts'
import { useData } from '../composables/useData.ts'
import { phrasesFor, phrasesOf, songOfWitness, useSongs } from '../lib/datasets.ts'
import { phraseTo } from '../lib/nav.ts'
const { witnessById } = useData()
const songs = useSongs()   // lazy songs.json: a witness that is a song links to /songs/:id
const wm = (w: string) => witnessById.value.get(w) as { media?: WitnessMedia; licenceNote?: string } | undefined
const oqOf = (w: string) => (witnessById.value.get(w) as { oq?: { score: number; band: string; preferred?: string[] } } | undefined)?.oq
const mediaOpen = ref<number>(), media = ref<WitnessMedia>(), mediaErr = ref(false)   // MV-1: «переглянути» opens the media panel under the row
const showMedia = async (i: number, w: string) => {
  if (mediaOpen.value === i) { mediaOpen.value = undefined; return }
  mediaErr.value = false; media.value = undefined; mediaOpen.value = i
  try { media.value = await resolveMedia(w, wm(w)) } catch { mediaErr.value = true }
}
const props = defineProps<{ lines: Kwic[]; limit?: number; lemma?: string; /** SPEC 63 PH: the node is a whole phraseme, not one word form (no /f link) */ plain?: boolean }>()
const phr = computed(() => (props.lemma && !props.plain ? phrasesFor(props.lemma) : undefined))   // SPEC 63 PH: a line that contains a phraseme candidate of this lemma links to its page (/p/:id)
const phraseOf = (k: Kwic) => {
  if (!props.lemma || props.plain) return undefined
  const t = `${k.left} ${k.node} ${k.right}`.toLowerCase(), n = k.node.toLowerCase()
  return phrasesOf(phr.value, props.lemma).find(p => p.id && p.spellings.some(s => s.length > n.length && s.includes(n) && t.includes(s)))
}
/** BL-6: the node word links to its form page (/f/:form), the lemma disambiguates shared spellings */
const formTo = (k: Kwic) => ({ path: `/f/${k.node}`, query: props.lemma ? { lemma: props.lemma } : {} })
const epochOf = (k: Kwic) => { const a = assignEpoch(k.date, 'shev'); return isKnown(a) ? a.value.epochs[0]! : 'unknown' }
const epochs = computed(() => [...new Set(props.lines.map(epochOf))])
const sel = ref(''), all = ref(false)
const shown = computed(() => props.lines.filter(k => !sel.value || epochOf(k) === sel.value).sort((a, b) => a.date[1] - b.date[1]))
/** SPEC 63 NV-1: expanded, the concordance is paged by KWIC_PAGE (20); local state, since several KWIC blocks can share one page/URL */
const kp = ref(1)
const kpages = computed(() => pageCount(shown.value.length, KWIC_PAGE))
watch(sel, () => { kp.value = 1 })
const view = computed(() => (all.value ? pageSlice(shown.value, Math.min(kp.value, kpages.value), KWIC_PAGE) : shown.value.slice(0, props.limit ?? 5)))
</script>

<template>
  <div>
    <div v-if="epochs.length > 1" class="row sans small" role="group" aria-label="Фільтр за епохою">
      <button type="button" class="chip" :aria-pressed="!sel" @click="sel = ''">усі епохи</button>
      <button v-for="e in epochs" :key="e" type="button" class="chip" :aria-pressed="sel === e" @click="sel = e">{{ epochShort(e) }}</button>
    </div>
    <div v-for="(k, i) in view" :key="i" class="kwic">
      <span :class="['l', { old: isOldForm(k.left, k.date[1]) }]"><span><MentionText :text="k.left" :witness="k.w" /></span></span>{{ ' ' }}<span v-if="plain" :class="['n', { old: isOldForm(k.node, k.date[1]) }]">{{ k.node }}</span><RouterLink v-else :class="['n', { old: isOldForm(k.node, k.date[1]) }]" :to="formTo(k)" :title="`сторінка форми «${k.node}»`">{{ k.node }}</RouterLink>{{ ' ' }}<span :class="['r', { old: isOldForm(k.right, k.date[1]) }]"><MentionText :text="k.right" :witness="k.w" /></span>
      <span class="cite"><SourceCite :w="k.w" :loc="k.loc" :date="k.date" :kwic="k" />
        <template v-if="oqOf(k.w)"> · <span class="badge" data-testid="oq-badge" :title="`невичитаний OCR archive.org, якість S = ${oqOf(k.w)!.score}; не є першою фіксацією й не дає епохи (SPEC 63 OQ)` + (oqOf(k.w)!.preferred ? '; є вичитане видання: ' + oqOf(k.w)!.preferred!.join(', ') : '')">OCR низької якості</span></template>
        <template v-if="phraseOf(k)"> · <RouterLink class="small" :to="phraseTo(phraseOf(k)!.id!)">сталий зворот →</RouterLink></template>
        <template v-if="songOfWitness(songs, k.w)"> · <RouterLink class="small" :to="`/songs/${songOfWitness(songs, k.w)!.id}`">пісня ♪</RouterLink></template>
        <template v-if="hasMedia(k.w, wm(k.w))"> · <button type="button" class="chip small" :aria-expanded="mediaOpen === i" @click="showMedia(i, k.w)">переглянути</button></template></span>
      <template v-if="mediaOpen === i">
        <MediaPanel v-if="media" :media="media" :licence-note="wm(k.w)?.licenceNote" :refs="[witnessById.get(k.w)?.url, k.w]" @close="mediaOpen = undefined" />
        <p v-else class="muted small sans" role="status">{{ mediaErr ? 'Медіа недоступне.' : 'Завантаження…' }}</p>
      </template>
    </div>
    <p v-if="!view.length" class="muted">Прикладів немає.</p>
    <button v-if="!all && shown.length > view.length" type="button" class="chip sans small" @click="all = true">більше… ({{ shown.length - view.length }})</button>
    <Pagination v-if="all" :page="Math.min(kp, kpages)" :pages="kpages" :total="shown.length" @go="kp = $event" />
  </div>
</template>
