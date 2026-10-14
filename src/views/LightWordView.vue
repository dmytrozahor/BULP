<script setup lang="ts">
/**
 * SPEC 63 PV-6 /lw/:lemma — light card of a VESUM lemma that the corpus attests but the full lexicon dropped (KEEP_MIN_F, SPEC 20 B-5a).
 * Shows only what the compact index holds: lemma, VESUM tags (verbatim), token count, first example token with its locator.
 */
import { computed, ref, watch } from 'vue'
import { loadLight } from '../lib/torotData.ts'
import { textTo, witnessTo } from '../lib/nav.ts'
import type { LightFile } from '../../pipelines/build-torot.ts'
import { useData } from '../composables/useData.ts'
import IkavismChain from '../components/IkavismChain.vue'
import { ikavismBase } from '../lib/lightcard.ts'
const props = defineProps<{ lemma: string }>()
const file = ref<LightFile>(), err = ref('')
watch(() => props.lemma, () => { loadLight().then(f => (file.value = f), e => (err.value = String(e))) }, { immediate: true })
const row = computed(() => file.value?.lemmas.find(l => l[0] === props.lemma))
const { annData, loaded } = useData()
/** GZ-4: the stem relative that proves the о/е > і alternation (покірність ~ покора) */
const base = computed(() => (row.value && loaded.value ? ikavismBase(row.value[0], annData.value.search.keys) : []))
const ex = computed(() => { const [w, loc, raw] = (row.value?.[3] ?? '').split('|'); return w ? { w, loc: loc ?? '', raw: raw ?? '' } : undefined })
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← тексти</RouterLink></p>
  <p v-if="err" class="muted sans">{{ err }}</p>
  <div v-else-if="!file" class="skeleton" style="height:4rem" />
  <p v-else-if="!row" class="muted sans">Легкої картки «{{ lemma }}» немає.</p>
  <template v-else>
    <h1>{{ row[0] }} <small class="muted sans">коротка картка</small></h1>
    <p class="sans small">VESUM: <code>{{ row[1] }}</code> · вжив. у корпусі: {{ row[2] }}</p>
    <p class="sans small muted">Мало засвідчена в нашому корпусі (f = {{ row[2] }}): повної картки немає, бо лема трапляється рідше за поріг лексикону (KEEP_MIN_F). Це не рідкісне слово мови: VESUM її знає.</p>
    <IkavismChain v-if="base.length" :lemma="row[0]" :paradigm="base" />
    <p v-if="ex" class="sans small">Приклад: <RouterLink :to="textTo(ex.w, ex.loc)">«{{ ex.raw }}»</RouterLink> · {{ ex.loc }} · <RouterLink :to="witnessTo(ex.w)">{{ ex.w }}</RouterLink></p>
  </template>
</template>
