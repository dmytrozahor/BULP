<script setup lang="ts">
/**
 * SPEC 63 OV-11 «Огляд» (owner 2026-10-22: «показуй за регіонами пам'яток та діалект на вкладинці "Огляд" … і приклад там само і значення і словозміну» · «та мапу показуй» · «і одразу розгорнутою»):
 * the default tab. Four sections, all expanded at once, each a COMPACT use of the block that lives in the other tabs (no second implementation): the region map with the
 * dialect chips, the best 1–2 KWIC lines, the sense timeline summary and the paradigm table. A section without data is one line, never an empty block.
 */
import { computed } from 'vue'
import type { Kwic as KwicLine, LemmaCard, StressVariant } from '../../core/types.ts'
import { useData } from '../composables/useData.ts'
import { pickExamples, regionLine } from '../lib/overview.ts'
import { openPanel } from '../lib/cardTabs.ts'
import OvPronunciation from './OvPronunciation.vue'
import OriginEty from './OriginEty.vue'
import RegionMap from './RegionMap.vue'
import DialectBlock from './DialectBlock.vue'
import Kwic from './Kwic.vue'
import SenseEpochs from './SenseEpochs.vue'
import Paradigm from './Paradigm.vue'
const props = defineProps<{
  lemma?: string; spelling: string; kwic: KwicLine[]; byRegion?: LemmaCard['stats']['byRegion']
  /** DOM id of the full map panel in «Поширення» (h-map / f-reg / t-reg) */
  mapPanel: string; seKind?: 'full' | 'light' | 'dict' | 'orv' | 'arch' | 'mu'
  paradigm?: { form: string; tags: string }[]; paradigmKind?: string; dictOnly?: boolean
  /** SPEC 63 OV-13 «Походження»: panel (DOM id) of the full provenance in «Історія»; `hasOrigin` = the host put first-attestation data in the #origin slot */
  /** SPEC 63 OV-14 «Вимова»: stress variants (word card), dictionary stress positions (thin card), the word to pronounce (default lemma / spelling) */
  stress?: StressVariant[]; stressPositions?: number[]; stressLoaded?: boolean; pronWord?: string
  originPanel?: string; hasOrigin?: boolean; /** one-line fallback of a card without first-attestation data (e.g. the derivation norm → modern) */ originLine?: string
  /** the dialect block is keyed by the spelling of a form page; the word card passes the lemma */
  dialectSpelling?: string
}>()
const { corpus, witnessById } = useData()
const regs = computed(() => regionLine(props.byRegion, corpus.value?.regions))
const hasRegions = computed(() => regs.value.length > 0)
const examples = computed(() => pickExamples(props.kwic, w => !!(witnessById.value.get(w) as { oq?: unknown } | undefined)?.oq))
const regionsForDialect = computed(() => regs.value)
const onMap = (e: MouseEvent) => { if (!(e.target as Element).closest('button, a, input')) openPanel(props.mapPanel) }
</script>

<template>
  <div class="ov" data-testid="overview">
    <section class="ov-sec ov-pron-sec" data-testid="ov-pronunciation" aria-labelledby="ov-h-pr">
      <h3 id="ov-h-pr" class="small sans">Вимова</h3>
      <OvPronunciation :word="pronWord ?? lemma ?? spelling" :stress="stress" :positions="stressPositions" :loaded="stressLoaded" />
    </section>
    <section class="ov-sec ov-origin" data-testid="ov-origin" aria-labelledby="ov-h-or">
      <h3 id="ov-h-or" class="small sans">Походження</h3>
      <slot name="origin"><p class="small sans muted" data-testid="ov-origin-none">{{ originLine ?? 'перша фіксація для цієї картки не встановлена (немає датованого свідчення в джерелах)' }}</p></slot>
      <OriginEty :lemma="lemma" />
      <p v-if="originPanel" class="small sans"><button type="button" class="chip small" @click="openPanel(originPanel)">докладніше в «Історія» →</button></p>
    </section>
    <section class="ov-sec" data-testid="ov-regions" aria-labelledby="ov-h-reg">
      <h3 id="ov-h-reg" class="small sans">Регіони пам’яток і діалект</h3>
      <template v-if="hasRegions">
        <div class="ov-map" @click="onMap"><RegionMap :by="byRegion" compact /></div>
        <p class="small sans"><button type="button" class="chip small" @click="openPanel(mapPanel)">усі регіони й повна карта у «Поширення» →</button></p>
      </template>
      <p v-else class="small sans muted" data-testid="ov-noregion">регіон пам’яток невідомий</p>
      <p v-if="hasRegions" class="small sans" data-testid="ov-attested"><span class="muted">засвідчено в: </span>{{ regs.map(r => `${r.name} (${r.f})`).join(', ') }}
        <span class="muted"> — регіон пам’ятки, а не діалектна мітка (FD-2).</span></p>
      <DialectBlock :spelling="dialectSpelling ?? spelling" :lemma="lemma" :regions="regionsForDialect" compact />
    </section>
    <section class="ov-sec" data-testid="ov-senses" aria-labelledby="ov-h-se">
      <h3 id="ov-h-se" class="small sans">Значення за епохами</h3>
      <SenseEpochs :word="lemma ?? spelling" :kind="seKind ?? 'full'" compact />
      <p class="small sans"><button type="button" class="chip small" @click="openPanel('h-sn')">усі значення у «Значення» →</button></p>
    </section>
    <section class="ov-sec" data-testid="ov-paradigm" aria-labelledby="ov-h-par">
      <h3 id="ov-h-par" class="small sans">Словозміна</h3>
      <Paradigm v-if="paradigm?.length || paradigmKind === 'uninflected'" :paradigm="paradigm ?? []" :kind="paradigmKind" />
      <p v-else class="small sans muted">парадигми немає в джерелах цієї картки</p>
      <p v-if="paradigm?.length" class="small sans"><button type="button" class="chip small" @click="openPanel('h-par')">з епохами у «Форми» →</button></p>
    </section>
    <section class="ov-sec" data-testid="ov-example" aria-labelledby="ov-h-ex">
      <h3 id="ov-h-ex" class="small sans">Приклад</h3>
      <Kwic v-if="examples.length" :lines="examples" :lemma="lemma" :limit="2" />
      <p v-else class="small sans muted">{{ dictOnly ? 'немає засвідчень у корпусі' : 'прикладів немає' }}</p>
    </section>
  </div>
</template>
