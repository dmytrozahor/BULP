<script setup lang="ts">
import { MODEL_NOTE, posShown } from '../../core/torot.ts'
/**
 * SPEC 63 PV-3 /name/:id and PV-5 /orv/:id — in-site card of a TOROT lemma that has no (VESUM-linked) modern lemma: a proper name (POS Ne) or an ORV-only lemma.
 * Everything shown is TOROT's own annotation (lemma, part-of-speech, morphology, citation-part); gloss and person/place type are «unknown» unless a cited source gives them.
 */
import { computed, ref, watch } from 'vue'
import type { Kwic } from '../../core/types.ts'
import type { NameCard, OrvCard } from '../../core/torot.ts'
import { torotCard } from '../lib/torotData.ts'
import { textTo, witnessTo, wordTo } from '../lib/nav.ts'
import { useData } from '../composables/useData.ts'
import { kwicFromRefs, witnessCounts } from '../lib/refKwic.ts'
import PlastSenses from '../components/PlastSenses.vue'
import ThinCard from '../components/ThinCard.vue'
import ThinTitle from '../components/ThinTitle.vue'
import WitnessBlock from '../components/WitnessBlock.vue'
const props = defineProps<{ id: string; kind: 'name' | 'orv' }>()
const found = computed(() => torotCard(props.kind, props.id))   // PF-1: the card's own bucket shard (tc/), not torot.json
const card = computed<NameCard | OrvCard | undefined>(() => found.value.value)
const err = ''
const { witnessById } = useData()
/** SPEC 63 CP-2/CP-3: the TOROT evidence as KWIC lines cut from the witness text, and its witnesses as the card graph; the modern form (VESUM) keys the lemma blocks when TOROT gives one */
const lines = ref<Kwic[]>([]); let seq = 0
watch(card, async c => { const n = ++seq; const k = c ? await kwicFromRefs(c.evidence, w => witnessById.value.get(w)?.date) : []; if (n === seq) lines.value = k }, { immediate: true })
const wits = computed(() => witnessCounts(card.value?.evidence ?? []))
const modern = computed(() => asName.value?.modern || undefined)
const asName = computed(() => (props.kind === 'name' ? (card.value as NameCard | undefined) : undefined))
const DICT_UK: Record<string, string> = { sum11: 'СУМ-11', sum20: 'СУМ-20' }
const asOrv = computed(() => (props.kind === 'orv' ? (card.value as OrvCard | undefined) : undefined))
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← тексти</RouterLink></p>
  <p v-if="err" class="muted sans">{{ err }}</p>
  <div v-else-if="!found.ready" class="skeleton" style="height:4rem" />
  <p v-else-if="!card" class="muted sans">Картки «{{ id }}» немає в TOROT-даних.</p>
  <template v-else>
    <h1><ThinTitle :word="card.lemma" historical /> <small class="muted sans">{{ kind === 'name' ? 'власна назва' : 'давньоруська лема без сучасного відповідника' }}</small></h1>
    <p v-if="asName?.basis" class="sans small">Підстава (SPEC 63 MU-3): слово з великої літери всередині абзацу, не розпізнане (форми немає у VESUM навіть після правил MU) і ніде в корпусі не вжите з малої; анотації TOROT тут немає · {{ card.n }} вжив.</p>
    <p v-else-if="card.model" class="sans small" data-testid="model-tag"><span class="badge" title="прогноз моделі Stanza ORV, а не золота розмітка TOROT">{{ MODEL_NOTE }}</span> <code>{{ posShown(card) }}</code> <code v-if="card.morph">{{ card.morph }}</code> · {{ card.n }} вжив.</p>
    <p v-else class="sans small">TOROT: <code>{{ card.pos }}</code> <code v-if="card.morph">{{ card.morph }}</code> · {{ card.n }} вжив.</p>
    <p v-if="asName" class="sans small">Тип: <b>{{ asName.kind === 'place' ? 'топонім (за газетиром)' : asName.basis ? 'невідомо (лише велика літера)' : 'невідомо (TOROT Ne не розрізняє особу/місце/народ)' }}</b>
      <template v-if="asName.modern"> · сучасна форма (VESUM): <RouterLink :to="wordTo(asName.modern)">{{ asName.modern }}</RouterLink></template>
      <template v-else> · сучасна форма: невідомо</template></p>
    <p v-if="asOrv" class="sans small">Чому без сучасного зв’язку: {{ asOrv.reason }} · значення (TOROT): невідомо — у XML немає глоси.</p>
    <p v-if="asOrv?.dictModern" class="sans small" data-testid="dict-modern">Сучасний відповідник за словником: <RouterLink :to="wordTo(asOrv.dictModern.form)"><strong>{{ asOrv.dictModern.form }}</strong></RouterLink>
      <span class="muted"> · {{ DICT_UK[asOrv.dictModern.dict] ?? asOrv.dictModern.dict }}<template v-if="asOrv.dictModern.loc"> · {{ asOrv.dictModern.loc }}</template> · «{{ asOrv.dictModern.q }}» · форма виведена за правилами, слово є заголовком словника (не VESUM)</span></p>
    <h2>Написання</h2>
    <p class="sans"><span v-for="f in card.forms" :key="f.raw" class="chip">{{ f.raw }} ×{{ f.f }}</span></p>
    <h2>{{ asName?.basis ? 'Свідчення (місце в тексті)' : card.model ? 'Свідчення (автоматична розмітка Stanza)' : 'Свідчення (TOROT, citation-part)' }}</h2>
    <ul class="sans small">
      <li v-for="(e, i) in card.evidence" :key="i"><RouterLink :to="textTo(e.w, e.loc)">«{{ e.raw }}»</RouterLink> · лема «{{ card.lemma }}», {{ e.morph }} · {{ e.loc }} · <RouterLink :to="witnessTo(e.w)">{{ e.w }}</RouterLink></li>
    </ul>
    <ThinCard se-kind="orv" :lemma="modern ?? card.lemma" :spelling="card.lemma" :kwic="lines" :f="card.n">
      <template #sources><WitnessBlock id="tc-wit" :items="wits" /></template>
      <template #meanings><PlastSenses :word="modern ?? card.lemma" /></template>
    </ThinCard>
  </template>
</template>
