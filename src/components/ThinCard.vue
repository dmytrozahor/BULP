<script setup lang="ts">
/**
 * SPEC 63 CV-5 (user 2026-10-16: «риночку* і такі слова теж!»): light / CV / unverified cards render the SAME card components as a lexicon card wherever the data exists —
 * KWIC lines, dialect block, derivation chain to the modern form, and (CP-2, LemmaBlocks) usage / loan labels, IPA, derivatives, dialect variants, senses, etymology / cognates, phrasemes. Every block is keyed by the lemma or the spelling and loads lazily
 * (senses.json, etymology.json, cognates.json); a block with no data collapses to «немає даних», nothing is invented.
 */
import { computed } from 'vue'
import type { Kwic as KwicLine } from '../../core/types.ts'
import { deriveWithSteps } from '../lib/derive.ts'
import { useData } from '../composables/useData.ts'
import { formRegions } from '../lib/formStats.ts'
import { fmtNum } from '../lib/format.ts'
import RegionMap from './RegionMap.vue'
import Panel from './Panel.vue'
import Kwic from './Kwic.vue'
import DialectBlock from './DialectBlock.vue'
import DerivationSteps from './DerivationSteps.vue'
import LemmaBlocks from './LemmaBlocks.vue'
import CardTabs from './CardTabs.vue'
import CardLayout from './CardLayout.vue'
import OverviewTab from './OverviewTab.vue'
import RegionBars from './RegionBars.vue'
import SenseEpochs from './SenseEpochs.vue'
const props = defineProps<{ /** SPEC 63 SE-6: card kind of the host view (label of the sense block) */ seKind?: 'light' | 'dict' | 'orv' | 'arch' | 'mu'; lemma?: string; spelling: string; kwic: KwicLine[]; /** SPEC 63 CP-4: corpus tokens of the word (f) for the «Статистика» panel; undefined = not known */ f?: number; /** SPEC 63 CP-6: dictionary stress (CvExtra.s) */ stress?: number[]; /** witness → count for the region map (default: one per KWIC line) */ witnesses?: Record<string, number>; /** the host page already prints these blocks */ noKwic?: boolean; noDerivation?: boolean; /** SPEC 63 DO-3: a dictionary-only card — the corpus blocks are collapsed with «немає засвідчень у корпусі» */ dictOnly?: boolean }>()
const d = computed(() => deriveWithSteps(props.spelling))
const best = computed(() => d.value.candidates[0])
const { corpus, witnessById } = useData()
/** SPEC 63 CP-4: region of the witnesses behind the card (a witness region, not a dialect label — SPEC 20 B-3.6) and the f / ipm line; HK needs the lemma's fMax and is not defined here */
const byRegion = computed(() => formRegions(props.witnesses ?? props.kwic, corpus.value?.regions, w => witnessById.value.get(w)?.region))
const nRegions = computed(() => byRegion.value.filter(r => r.f).length)
const ipm = computed(() => (props.f && corpus.value?.N ? (props.f / corpus.value.N) * 1e6 : undefined))
</script>

<template>
  <div data-testid="thin-card">
    <CardLayout>
    <CardTabs>
      <template #overview>
        <OverviewTab :lemma="lemma" :spelling="spelling" :kwic="kwic" :by-region="byRegion" map-panel="t-reg" :pron-word="spelling" :stress-positions="stress" :origin-panel="noDerivation ? undefined : 't-der'" :origin-line="noDerivation ? undefined : `перша фіксація не встановлена; за правилами: норма ${d.norm}${best ? ' → сучасна (гіпотеза) ' + best.form : ''}`" :se-kind="seKind ?? (dictOnly ? 'dict' : 'light')" :dict-only="dictOnly" />
      </template>
      <template #forms><LemmaBlocks :lemma="lemma" :spelling="spelling" :stress="stress" tab="forms" /><slot name="forms" /></template>
      <template #history>
        <Panel v-if="!noDerivation" id="t-der" :open="true" :count="best?.steps.length ?? 0" title="Виведення · Derivation" :summary="best ? `${best.steps.length} кроків → ${best.form}` : 'без змін'" :empty="!best">
          <p class="sans small"><span class="muted">норма: </span>{{ d.norm }}<template v-if="best"> <span class="muted"> · сучасна (гіпотеза за правилами): </span>{{ best.form }}</template></p>
          <DerivationSteps v-if="best" :steps="best.steps" :uid="`t-${spelling}`" :lemma="lemma" panel="chain" />
        </Panel>
        <LemmaBlocks :lemma="lemma" :spelling="spelling" :stress="stress" tab="history" /><slot name="history" />
      </template>
      <template #meanings>
        <slot name="meanings" />
        <SenseEpochs :word="lemma ?? spelling" :kind="seKind ?? (dictOnly ? 'dict' : 'light')" />   <!-- SPEC 63 SE-5/SE-6 «Значення за епохами» -->
        <LemmaBlocks :lemma="lemma" :spelling="spelling" :stress="stress" tab="meanings" />
      </template>
      <template #spread>
        <Panel id="t-dia" :open="true" title="Діалект · Dialect" summary="ознаки, клас форм, літературний відповідник"><DialectBlock :spelling="spelling" :lemma="lemma" /></Panel>
        <Panel id="t-reg" :open="false" :count="nRegions" title="Карта · регіон пам’ятки" :summary="`${nRegions} регіонів`" :empty="!nRegions" :empty-text="dictOnly ? 'немає засвідчень у корпусі' : 'регіон пам’яток не визначено'"
          info="Регіон пам’ятки, а не діалектна мітка (SPEC 20 B-3.6).">
          <RegionMap :by="byRegion" />
        </Panel>
        <LemmaBlocks :lemma="lemma" :spelling="spelling" :stress="stress" tab="spread" />
      </template>
      <template #sources>
        <slot name="sources" />
        <Panel v-if="!noKwic" id="t-kw" :open="kwic.length > 0" :count="kwic.length" title="Приклади · KWIC" :summary="kwic.length ? `${kwic.length} рядків` : ''" :empty="!kwic.length" :empty-text="dictOnly ? 'немає засвідчень у корпусі' : undefined">
          <Kwic :lines="kwic" :lemma="lemma" />
        </Panel>
      </template>
    </CardTabs>
    <template #side>
        <Panel id="t-st" :open="false" title="Статистика" :summary="f ? `f = ${fmtNum(f)}${ipm !== undefined ? ' · ' + fmtNum(ipm, 2) + ' ipm' : ''}` : ''" :empty="!f" :empty-text="f === 0 || dictOnly ? 'f = 0: немає засвідчень у корпусі' : 'частоту не визначено'"
          info="HK і рівномірність (DP) потребують повної картки леми; для короткої картки подано лише f та ipm.">
          <p class="sans small">f = {{ fmtNum(f ?? 0) }} · {{ ipm !== undefined ? fmtNum(ipm, 2) : '—' }} ipm · N = {{ fmtNum(corpus?.N ?? 0) }} слів</p>
        </Panel>
        <Panel id="t-sr" :open="true" title="За регіонами" summary="ipm у регіоні = f / N слів пам’яток регіону"><RegionBars :by="byRegion" /></Panel>
    </template>
    </CardLayout>
  </div>
</template>
