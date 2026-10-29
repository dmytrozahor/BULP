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
import LabelsBlock from './LabelsBlock.vue'
import SociolectBadges from './SociolectBadges.vue'
import ModernBadges from './ModernBadges.vue'
import LoanChip from './LoanChip.vue'
import LoanAdaptBlock from './LoanAdaptBlock.vue'
import IpaRow from './IpaRow.vue'
import DerivativesBlock from './DerivativesBlock.vue'
import DimLine from './DimLine.vue'
import VariantFamilyLine from './VariantFamilyLine.vue'
import CardRules from './CardRules.vue'
import DialectVariants from './DialectVariants.vue'
import DeicticStructure from './DeicticStructure.vue'
import HeteronymReadings from './HeteronymReadings.vue'
import SensesBlock from './SensesBlock.vue'
import EtymologyBlock from './EtymologyBlock.vue'
import CognatesPanel from './CognatesPanel.vue'
import PhrasePanel from './PhrasePanel.vue'
import StressForms from './StressForms.vue'
import { cvStressVariants } from '../../core/cv.ts'
import type { TabId } from '../lib/cardTabs.ts'
const props = withDefaults(defineProps<{ /** card kind (SE panel id of the labels block) */ kind?: 'full' | 'light' | 'dict' | 'orv' | 'arch' | 'mu' | 'form'; lemma?: string; spelling: string; labels?: boolean; /** SPEC 63 CP-6: dictionary stress of the card word (CvExtra.s from the build) */ stress?: number[]; /** SPEC 63 OV-10: render only the blocks of this card tab (none = all blocks, as before) */ tab?: TabId }>(), { labels: true })   // CP-10.2: an absent Boolean prop is cast to false by Vue, which hid the loan, stress and badge lines on every thin card
const w = computed(() => props.lemma ?? props.spelling)
const variants = computed(() => cvStressVariants(props.lemma ?? props.spelling, props.stress))
const senses = computed(() => sensesOf(w.value))
const on = (t: TabId) => !props.tab || props.tab === t
</script>

<template>
  <div data-testid="lemma-blocks" :data-tab="tab">
    <Panel v-if="on('meanings')" id="t-lab" :open="true" title="Мітки · Labels" summary="діалект · регістр · тип · значення, кожне з методом і доказами"
      info="Діалект, регістр, тип і значення з методом («як визначено») і доказами; якщо даних немає, написано, що саме перевірено. Методологія: «Як визначаються мітки».">
      <LabelsBlock :lemma="w" :kind="kind ?? 'light'" />
    </Panel>
    <p v-if="on('meanings')" class="sans small"><UsageChips :lemma="w" label /> <template v-if="labels !== false"><SociolectBadges :word="w" /> <ModernBadges :word="w" /></template> <LoanChip :word="w" /></p>
    <LoanAdaptBlock v-if="labels !== false && on('history')" :word="w" />
    <p v-if="labels !== false && on('forms')" class="sans small" data-testid="cp-stress"><span class="muted">Наголос: </span><StressForms v-if="variants.length" :variants="variants" /><span v-else class="unk" tabindex="0" title="немає доказів — значення не встановлено (P-3.1)">наголос не встановлено</span></p>
    <Panel v-if="on('forms')" id="t-ipa" :open="false" title="Вимова · IPA" :summary="variants.length ? 'виведено за правилами (P-1.7) зі словникового наголосу' : 'виведено за правилами (P-1.7), наголосу в джерелах цієї картки немає'"
      info="IPA — не словникова вимова, а результат правил; кожне правило з цитатою всередині. Словниковий наголос (ukrainian-word-stress) береться з даних картки (CP-6), де збірка його знайшла.">
      <IpaRow :variants="variants" :lemma="w" />
    </Panel>
    <DimLine v-if="on('forms')" :lemma="w" />
    <VariantFamilyLine v-if="on('forms')" :lemma="w" />
    <CardRules v-if="on('forms')" :lemma="lemma" :spelling="spelling" :skip-features="kind === 'form'" />   <!-- CP-8: MM-16 chips, MM-29..35 pairs / variants, MM-36 contact form-type -->
    <DerivativesBlock v-if="on('forms')" panel :lemma="w" />
    <DialectVariants v-if="on('spread')" :lemma="w" />
    <DeicticStructure v-if="on('forms')" :word="spelling" />
    <HeteronymReadings v-if="on('forms')" :form="spelling" />
    <Panel v-if="on('meanings')" id="t-sn" :open="false" :count="senses.length" title="Значення · Senses" :summary="sensesSummary(senses)" :empty="!senses.length" empty-text="значень не засвідчено у Вікісловнику"
      info="Значення — з розділу «Значення» uk.wiktionary (CC BY-SA 4.0), скорочено; не словникова норма проєкту.">
      <SensesBlock :lemma="w" />
    </Panel>
    <template v-if="on('history')"><EtymologyBlock :lemma="w" /><CognatesPanel :lemma="w" /></template>
    <PhrasePanel v-if="on('meanings')" :lemma="w" />
  </div>
</template>
