<script setup lang="ts">
/**
 * Heteronym readings (SPEC 60 HT-2, research/25 §4): every stress with its meaning and source. Pairs from СУМ-20 carry a verbatim quote [Q];
 * pairs from the Wikipedia list «Омографи» are paraphrase [P] until checked. A heteronym is never merged into the lemma's free stress variants.
 * `послуха́тися` (U-26) is shown as an unverified user assertion [U] next to the one dictionary stress — never as a reading (HT-3).
 * `bare` = compact form for the annotator popover.
 */
import { computed } from 'vue'
import { HETERONYM_FLAG, READING_KIND_UK, heteronymOf, unverifiedOf } from '../../core/heteronyms.ts'
import { dictCandidates } from '../lib/datasets.ts'
import { senseRevision, sensesWithStress } from '../../core/senses.ts'
import { SENSES_LICENCE, sensesOf, wiktUrl } from '../lib/sensesData.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ form: string; bare?: boolean }>()
const h = computed(() => heteronymOf(props.form))
const u = computed(() => unverifiedOf(props.form))
/** HT-1 candidates from heteronyms.json (lazy): method «dictionary», status «unknown»: shown apart, never as verified readings; hidden when a verified entry already lists every stress */
const cand = computed(() => {
  const c = dictCandidates(props.form)
  if (!c) return undefined
  const known = new Set(h.value?.readings.map(r => r.stressed.normalize('NFC')) ?? [])
  return c.stresses.every(x => known.has(x.normalize('NFC'))) ? undefined : c
})
const ASPECT = { pf: 'док.', ipf: 'недок.' } as const
/** BL-9: Wiktionary senses mapped to a reading by its stressed spelling */
const wikt = (r: { lemma: string; stressed: string }) => sensesWithStress(sensesOf(r.lemma), r.stressed).slice(0, 4)
const revOf = (r: { lemma: string; stressed: string }) => { const s = wikt(r)[0]; return s ? senseRevision(s) : undefined }
</script>

<template>
  <div v-if="h || u || cand" :class="bare ? 'het' : 'card'" aria-label="Наголос і значення">
    <h2 v-if="!bare"><span>Наголос і значення</span><span class="small">омографи</span></h2>
    <template v-if="h">
      <p class="sans" :style="bare ? 'margin:.3rem 0' : ''"><span class="badge dialect" title="СУМ-20 / Вікіпедія «Омографи»">{{ HETERONYM_FLAG }}</span>
        <span v-if="h.confidence === 'P'" class="derived-badge" title="пару знайдено лише у списку Вікіпедії; словник ще не перевірено">P · не перевірено у словнику</span>
        <span v-else class="attested-badge">Q · СУМ-20</span></p>
      <ul class="sans" style="list-style:none;padding:0;margin:.3rem 0">
        <li v-for="r in h.readings" :key="r.stressed" style="margin:.35rem 0">
          <EvidencePopover :evidence="r.evidence" :heading="`Наголос: ${r.stressed}`" :meta="`${READING_KIND_UK[r.kind]}${r.cases ? ' · однакові лише в ' + r.cases.join(', ') : ''}`" :label="r.stressed">
            <strong style="font-family:var(--serif);font-size:1.15rem">{{ r.stressed }}</strong>
          </EvidencePopover>
          <span class="small"> {{ r.pos ?? '' }}<template v-if="r.aspect"> · {{ ASPECT[r.aspect] }}</template> · <span class="muted">{{ READING_KIND_UK[r.kind] }}</span>
            <template v-if="r.cases"> · <span class="muted">збігаються лише: {{ r.cases.join(', ') }}</span></template></span>
          <div v-if="r.gloss" class="small">«{{ r.gloss }}»</div>
          <div v-else class="small muted">значення не наведено у списку-джерелі (P)</div>
          <!-- BL-9: the Wiktionary senses whose stressed syllable division equals this reading (collapsed; nothing guessed when the page gives no stress) -->
          <details v-if="wikt(r).length" class="small wsenses" style="margin:.15rem 0">
            <summary>Вікісловник: {{ wikt(r)[0]!.gloss }}<template v-if="wikt(r).length > 1"> · значень: {{ wikt(r).length }}</template></summary>
            <ol style="margin:.2rem 0 .2rem 1.2rem;padding:0"><li v-for="(s, i) in wikt(r)" :key="i">{{ s.gloss }}</li></ol>
            <span class="muted">{{ SENSES_LICENCE }}; <a :href="wiktUrl(r.lemma, revOf(r))" target="_blank" rel="noopener">стаття «{{ r.lemma }}»</a></span>
          </details>
        </li>
      </ul>
      <p v-if="!bare" class="small muted sans">Це окремі записи, а не вільні варіанти наголосу одного слова (як за́вжди́). У тексті без наголосів прочитання не обирається: показано всі.</p>
    </template>
    <div v-if="cand" class="small sans" style="margin:.4rem 0">
      <span class="unk" tabindex="0" title="метод: словник · статус: невідомо (P-1.7)">кандидати з наголосом: <strong style="font-family:var(--serif)">{{ cand.stresses.join(' / ') }}</strong></span>
      <span class="derived-badge" title="method: dictionary · status: unknown">не підтверджено</span>
      <div class="muted">{{ cand.note }} Джерело: {{ cand.source }}.</div>
    </div>
    <div v-if="u" class="small sans" style="margin:.4rem 0">
      <span class="unk" tabindex="0" title="немає джерела — значення не встановлено (P-3.1)">[U] не підтверджено: {{ u.asserted }}</span>
      <EvidencePopover :evidence="u.known" heading="У словнику є лише один наголос" :label="u.form"><span class="badge">ⓘ що є в словнику</span></EvidencePopover>
      <div class="muted">{{ u.note }}</div>
    </div>
  </div>
</template>
