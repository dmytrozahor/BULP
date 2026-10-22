<script setup lang="ts">
/**
 * SPEC 63 OV-14: «Вимова» in «Огляд»: the stress variants (StressForms, as in the card header), the IPA derived by rule (never a dictionary fact, P-1.7) and, while a dialect is chosen in the
 * «Говір» switch, the respelled form (Spell: rule chip on hover) with the dialect IPA. «наголос не встановлено» when no stress is known. Reuses StressForms, Spell, ipaOf; no second implementation.
 */
import { computed } from 'vue'
import type { StressVariant } from '../../core/types.ts'
import { renderStress } from '../../core/text.ts'
import { DIALECTS } from '../../core/rules.ts'
import { dialect, ipaOf } from '../lib/views.ts'
import StressForms from './StressForms.vue'
import Spell from './Spell.vue'
const props = defineProps<{ word: string; /** stress variants of a word card */ stress?: StressVariant[]; /** dictionary stress positions of a thin card */ positions?: number[]; loaded?: boolean }>()
const variants = computed(() => props.stress ?? [])
const pos = computed<number[] | undefined>(() => (variants.value[0]?.positions as number[] | undefined) ?? props.positions)
const base = computed(() => variants.value[0]?.form ?? props.word)
const hasStress = computed(() => variants.value.length > 0 || !!props.positions?.length)
const ipa = (d: string) => { try { return ipaOf(base.value, d, { positions: pos.value }).ipa } catch { return '' } }
const std = computed(() => ipa('')), dia = computed(() => (dialect.value ? ipa(dialect.value) : ''))
const dname = computed(() => DIALECTS[dialect.value] ?? dialect.value)
</script>

<template>
  <div class="sans small ov-pron" data-testid="ov-pron">
    <p style="margin:.1rem 0">
      <template v-if="variants.length"><StressForms :variants="variants" /></template>
      <template v-else-if="positions?.length"><strong style="font-size:1.1rem">{{ renderStress(word, positions) }}</strong> <span class="muted">· словниковий наголос</span></template>
      <span v-else-if="loaded !== false" class="unk" tabindex="0" title="немає доказів — значення не встановлено (P-3.1)">наголос не встановлено</span>
      <span v-else class="muted">наголос: завантаження…</span>
    </p>
    <p v-if="std" style="margin:.1rem 0"><span class="muted">IPA: </span><span :title="'IPA виведено за правилами (P-1.7), не словникова вимова'">{{ std }}</span> <span class="muted">· виведено за правилами{{ hasStress ? '' : ', без наголосу' }}</span></p>
    <p v-if="dialect" style="margin:.1rem 0" data-testid="ov-pron-dialect"><span class="muted">говір «{{ dname }}»: </span><Spell :w="word" /> <span v-if="dia" class="muted">·</span> {{ dia }}
      <span v-if="dia && dia === std" class="muted"> (збігається з літературною)</span></p>
  </div>
</template>
