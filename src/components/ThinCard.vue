<script setup lang="ts">
/**
 * SPEC 63 CV-5 (user 2026-10-16: «риночку* і такі слова теж!»): light / CV / unverified cards render the SAME card components as a lexicon card wherever the data exists —
 * KWIC lines, dialect block, derivation chain to the modern form, senses, etymology / cognates, usage labels. Every block is keyed by the lemma or the spelling and loads lazily
 * (senses.json, etymology.json, cognates.json); a block with no data collapses to «немає даних», nothing is invented.
 */
import { computed } from 'vue'
import type { Kwic as KwicLine } from '../../core/types.ts'
import { deriveWithSteps } from '../lib/derive.ts'
import Panel from './Panel.vue'
import Kwic from './Kwic.vue'
import DialectBlock from './DialectBlock.vue'
import DerivationSteps from './DerivationSteps.vue'
import SensesBlock from './SensesBlock.vue'
import EtymologyBlock from './EtymologyBlock.vue'
import CognatesPanel from './CognatesPanel.vue'
import UsageChips from './UsageChips.vue'
import SociolectBadges from './SociolectBadges.vue'
const props = defineProps<{ lemma?: string; spelling: string; kwic: KwicLine[]; /** SPEC 63 DO-3: a dictionary-only card — the corpus blocks are collapsed with «немає засвідчень у корпусі» */ dictOnly?: boolean }>()
const d = computed(() => deriveWithSteps(props.spelling))
const best = computed(() => d.value.candidates[0])
</script>

<template>
  <div data-testid="thin-card">
    <p v-if="lemma" class="sans small"><UsageChips :lemma="lemma" label /> <SociolectBadges :word="lemma" /></p>
    <Panel id="t-kw" :open="kwic.length > 0" :count="kwic.length" title="Приклади · KWIC" :summary="kwic.length ? `${kwic.length} рядків` : ''" :empty="!kwic.length" :empty-text="dictOnly ? 'немає засвідчень у корпусі' : undefined">
      <Kwic :lines="kwic" :lemma="lemma" />
    </Panel>
    <Panel id="t-dia" :open="true" title="Діалект · Dialect" summary="ознаки, клас форм, літературний відповідник"><DialectBlock :spelling="spelling" :lemma="lemma" /></Panel>
    <Panel id="t-der" :open="true" :count="best?.steps.length ?? 0" title="Виведення · Derivation" :summary="best ? `${best.steps.length} кроків → ${best.form}` : 'без змін'" :empty="!best">
      <p class="sans small"><span class="muted">норма: </span>{{ d.norm }}<template v-if="best"> <span class="muted"> · сучасна (гіпотеза за правилами): </span>{{ best.form }}</template></p>
      <DerivationSteps v-if="best" :steps="best.steps" :uid="`t-${spelling}`" :lemma="lemma" panel="chain" />
    </Panel>
    <template v-if="lemma">
      <SensesBlock :lemma="lemma" />
      <EtymologyBlock :lemma="lemma" /><CognatesPanel :lemma="lemma" />
    </template>
  </div>
</template>
