<script setup lang="ts">
/**
 * SPEC 63 PV-6 / CV-1 /lw/:lemma — light card: a VESUM lemma that the corpus attests but the full lexicon dropped (KEEP_MIN_F, SPEC 20 B-5a), and/or a word attested in a dictionary
 * witness (headword or quoted equivalent) — each attestation line = dictionary, date, quoted article start, locator. A spelling VESUM does not know is carried as attested.
 */
import { computed, ref, watch } from 'vue'
import { loadLight } from '../lib/torotData.ts'
import { loadCv } from '../lib/cardIndex.ts'
import { textTo, witnessTo } from '../lib/nav.ts'
import type { LightFile } from '../../pipelines/build-torot.ts'
import type { CvEntry } from '../../core/cv.ts'
import { key } from '../../core/text.ts'
import { useData } from '../composables/useData.ts'
import IkavismChain from '../components/IkavismChain.vue'
import { ikavismBase } from '../lib/lightcard.ts'
const props = defineProps<{ lemma: string }>()
const file = ref<LightFile>(), cv = ref<CvEntry>(), err = ref(''), done = ref(false)
watch(() => props.lemma, () => {
  done.value = false; cv.value = undefined
  Promise.all([loadLight().then(f => (file.value = f)), loadCv(props.lemma).then(e => (cv.value = e))]).catch(e => (err.value = String(e))).finally(() => (done.value = true))
}, { immediate: true })
const row = computed(() => file.value?.lemmas.find(l => l[0] === props.lemma) ?? file.value?.lemmas.find(l => key(l[0]) === key(props.lemma)))
const { annData, loaded, witnessById } = useData()
const word = computed(() => row.value?.[0] ?? cv.value?.[0] ?? props.lemma)
const tags = computed(() => row.value?.[1] ?? cv.value?.[1] ?? '')
/** GZ-4: the stem relative that proves the о/е > і alternation (покірність ~ покора) */
const base = computed(() => (row.value && loaded.value ? ikavismBase(row.value[0], annData.value.search.keys) : []))
const ex = computed(() => { const [w, loc, raw] = (row.value?.[3] ?? '').split('|'); return w ? { w, loc: loc ?? '', raw: raw ?? '' } : undefined })
const wt = (id: string) => witnessById.value.get(id)?.title ?? id
const wd = (id: string) => { const d = witnessById.value.get(id)?.date; return d ? (d[0] === d[1] ? String(d[0]) : `${d[0]}–${d[1]}`) : '' }
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← тексти</RouterLink></p>
  <p v-if="err" class="muted sans">{{ err }}</p>
  <div v-else-if="!done" class="skeleton" style="height:4rem" />
  <p v-else-if="!row && !cv" class="muted sans">Легкої картки «{{ lemma }}» немає.</p>
  <template v-else>
    <h1>{{ word }} <small class="muted sans">коротка картка</small></h1>
    <p v-if="tags" class="sans small">VESUM: <code>{{ tags }}</code><template v-if="row"> · вжив. у корпусі: {{ row[2] }}</template></p>
    <p v-else class="sans small"><b>Написання як засвідчене:</b> ВЕСУМ такої форми не підтверджує, лематизацію не вгадано; картка подає лише рядки словників.</p>
    <p v-if="row" class="sans small muted">Мало засвідчена в нашому корпусі (f = {{ row[2] }}): повної картки немає, бо лема трапляється рідше за поріг лексикону (KEEP_MIN_F). Це не рідкісне слово мови: VESUM її знає.</p>
    <p v-else class="sans small muted">Слово засвідчене лише в словниках (заголовне слово або цитований відповідник); у корпусі текстів не трапляється, тому повної картки з частотами немає.</p>
    <IkavismChain v-if="row && base.length" :lemma="row[0]" :paradigm="base" />
    <p v-if="ex" class="sans small">Приклад: <RouterLink :to="textTo(ex.w, ex.loc)">«{{ ex.raw }}»</RouterLink> · {{ ex.loc }} · <RouterLink :to="witnessTo(ex.w)">{{ ex.w }}</RouterLink></p>
    <template v-if="cv">
      <h2>Засвідчення у словниках <small class="muted sans">{{ cv[2] }}</small></h2>
      <ul class="sans small">
        <li v-for="(a, i) in cv[3]" :key="i"><b>{{ a[2] }}</b> · <RouterLink :to="witnessTo(a[0])">{{ wt(a[0]) }}</RouterLink><template v-if="wd(a[0])">, {{ wd(a[0]) }}</template> · <RouterLink :to="textTo(a[0], a[1])">{{ a[1] }}</RouterLink></li>
      </ul>
      <p v-if="cv[2] > cv[3].length" class="sans small muted">Показано {{ cv[3].length }} з {{ cv[2] }} засвідчень.</p>
    </template>
  </template>
</template>
