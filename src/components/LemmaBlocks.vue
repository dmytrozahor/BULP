<script setup lang="ts">
/**
 * SPEC 63 CP-2 (user 2026-10-21: «all features of ours should be implemented on each word card»): every lemma- or spelling-keyed block of the full word card, as ONE component that the
 * light / dictionary-only / unverified / archaic / TOROT cards (through ThinCard) and the form page mount. The blocks are the full card's own components (not copies); each loads its
 * shard lazily on mount/expand and collapses with an honest empty state when there is no data. Nothing is invented: a lookup with no hit shows «… немає».
 * `labels=false`: the host page already prints the sociolect / modern / loan-adaptation badges in its header (form page).
 */
import { computed } from 'vue'
import { sensesOf, sensesSummary } from '../lib/sensesData.ts'
import Panel from './Panel.vue'
import UsageChips from './UsageChips.vue'
import SociolectBadges from './SociolectBadges.vue'
import ModernBadges from './ModernBadges.vue'
import LoanChip from './LoanChip.vue'
import LoanAdaptBlock from './LoanAdaptBlock.vue'
import IpaRow from './IpaRow.vue'
import DerivativesBlock from './DerivativesBlock.vue'
import DialectVariants from './DialectVariants.vue'
import DeicticStructure from './DeicticStructure.vue'
import HeteronymReadings from './HeteronymReadings.vue'
import SensesBlock from './SensesBlock.vue'
import EtymologyBlock from './EtymologyBlock.vue'
import CognatesPanel from './CognatesPanel.vue'
import PhrasePanel from './PhrasePanel.vue'
const props = defineProps<{ lemma?: string; spelling: string; labels?: boolean }>()
const w = computed(() => props.lemma ?? props.spelling)
const senses = computed(() => sensesOf(w.value))
</script>

<template>
  <div data-testid="lemma-blocks">
    <p class="sans small"><UsageChips :lemma="w" label /> <template v-if="labels !== false"><SociolectBadges :word="w" /> <ModernBadges :word="w" /></template> <LoanChip :word="w" /></p>
    <LoanAdaptBlock v-if="labels !== false" :word="w" />
    <Panel id="t-ipa" :open="false" title="Вимова · IPA" summary="виведено за правилами (P-1.7), наголосу в джерелах цієї картки немає"
      info="IPA — не словникова вимова, а результат правил; кожне правило з цитатою всередині. Наголос зі словників (ВЕСУМ / r2u) на цій картці ще не підключено: SPEC 63 CP-6.">
      <IpaRow :variants="[]" :lemma="w" />
    </Panel>
    <DerivativesBlock panel :lemma="w" />
    <DialectVariants :lemma="w" />
    <DeicticStructure :word="spelling" />
    <HeteronymReadings :form="spelling" />
    <Panel id="t-sn" :open="false" :count="senses.length" title="Значення · Senses" :summary="sensesSummary(senses)" :empty="!senses.length" empty-text="значень не засвідчено у Вікісловнику"
      info="Значення — з розділу «Значення» uk.wiktionary (CC BY-SA 4.0), скорочено; не словникова норма проєкту.">
      <SensesBlock :lemma="w" />
    </Panel>
    <EtymologyBlock :lemma="w" /><CognatesPanel :lemma="w" />
    <PhrasePanel :lemma="w" />
  </div>
</template>
