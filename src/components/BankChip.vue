<script setup lang="ts">
/**
 * SPEC 60 BK-2: chip «тип: південно-західний / південно-східний» for a form or a lemma's spellings, from the cited-feature model of core/banks.ts.
 * The popover carries (a) the matched features with their source quotes (P-1.1 evidence), (b) why the type is SW vs SE and NOT the Dnipro banks
 * (BANK_EXPLAIN), (c) the model's inputs: gated-off rows, the insufficient-evidence rule and the flagged calibration constant (P-1.7).
 * Below the threshold the chip says «недостатньо даних» — never a number (P-3.1).
 */
import { computed } from 'vue'
import { BANK_CALIBRATION_NOTE, BANK_EXPLAIN, BANK_FEATURES, BANK_MIN_STRONG, bankScore, type BankInput } from '../../core/banks.ts'
import { useData } from '../composables/useData.ts'
import { hitsOf } from '../lib/analyze.ts'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ forms: BankInput[] }>()
const { annData } = useData()
const res = computed(() => bankScore(props.forms, { vesum: f => hitsOf(annData.value, f), inLexicon: f => hitsOf(annData.value, f) }))
const NAME = { SW: 'південно-західний', SE: 'південно-східний' } as const
const text = computed(() => `тип: ${res.value.status === 'scored' ? NAME[res.value.type!] : 'недостатньо даних'}`)
const pct = (p: number) => `${Math.round(p * 100)} %`
const evidence = computed(() => (res.value.status === 'scored' ? [...res.value.claim.evidence, ...BANK_EXPLAIN.evidence] : BANK_EXPLAIN.evidence))
const meta = computed(() => (res.value.status === 'scored' ? `P(пд.-сх.) ${pct(res.value.pSE)} · P(пд.-зах.) ${pct(res.value.pSW)}` : `збігів із вагою ≥ 2: ${res.value.strong} з ${BANK_MIN_STRONG} потрібних`))
const idOf = (id: string) => BANK_FEATURES.find(f => f.id === id)
</script>

<template>
  <span class="bankchip">
    <EvidencePopover :evidence="evidence" heading="Тип: південно-західний чи південно-східний" :meta="meta" :label="text">
      <span :class="['badge', res.status === 'scored' ? 'dialect' : 'unk']">{{ text }}<small v-if="res.status === 'scored'" class="muted">{{ pct(res.type === 'SE' ? res.pSE : res.pSW) }}</small><i class="evmark" aria-hidden="true">ⓘ</i></span>
      <template #extra>
        <p class="small sans" style="margin:.5rem 0 .3rem">{{ BANK_EXPLAIN.text }}</p>
        <p v-if="res.matched.length" class="small sans" style="margin:.3rem 0">Збіги: <template v-for="(h, i) in res.matched" :key="h.feature.id"><template v-if="i">, </template><code>{{ h.feature.id }}</code> ({{ h.feature.side === 'SE' ? 'пд.-сх.' : 'пд.-зах.' }}, вага {{ h.feature.weight }}{{ h.half ? ', ×½ книжна норма' : '' }}) у «{{ h.form }}»</template>.</p>
        <p v-if="res.gatedOff.length" class="small sans muted" style="margin:.3rem 0">Не враховано за датою (текст давніший за ознаку): <template v-for="(id, i) in res.gatedOff" :key="id"><template v-if="i">, </template><code>{{ id }}</code><template v-if="idOf(id)?.earliest"> (від {{ idOf(id)!.earliest }})</template></template>.</p>
        <p v-if="res.status === 'insufficient'" class="small sans muted" style="margin:.3rem 0">Потрібно щонайменше {{ BANK_MIN_STRONG }} збіги ознак із вагою ≥ 2; інакше число не показується.</p>
        <p class="small sans muted" style="margin:.3rem 0">Це оцінка мови написання, а не висновок про місце створення тексту. {{ BANK_CALIBRATION_NOTE }}.</p>
      </template>
    </EvidencePopover>
  </span>
</template>
