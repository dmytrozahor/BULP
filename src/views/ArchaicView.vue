<script setup lang="ts">
/**
 * SPEC 63 AR-1/AR-2 /ar/:id — card of an archaic lemma: a headword of the historical dictionary (BL-11) that VESUM does not know, or an `unverified` recurring unresolved cluster.
 * Everything shown is the dictionary's own header line (quote + locator) and the corpus lines; what no source states is «невідомо».
 */
import { computed, ref, watch } from 'vue'
import type { Kwic } from '../../core/types.ts'
import type { ArchDict, ArchEntry } from '../../core/archaic.ts'
import { useData } from '../composables/useData.ts'
import PlastSenses from '../components/PlastSenses.vue'
import WitnessBlock from '../components/WitnessBlock.vue'
import ThinCard from '../components/ThinCard.vue'
import { kwicFromRefs } from '../lib/refKwic.ts'
import { archEntryOf } from '../lib/torotData.ts'
import { textTo, witnessTo } from '../lib/nav.ts'
const props = defineProps<{ id: string }>()
const found = computed(() => archEntryOf(props.id)), err = ''   // PF-1: the entry's bucket shard (tc/arch), not archaic.json
/** NV-4: the lookup is case-insensitive (Приборниця = приборниця) */
const e = computed<ArchEntry | undefined>(() => found.value.value)
const { witnessById } = useData()
const wTitle = (id: string) => witnessById.value.get(id)?.title ?? id
const GLOSS_LANG = ['рос.', 'чес.', 'нім.']
/** all dictionaries that list the headword; a term list (kind 'term') is badged «технічний термін <рік>», never «застаріле» */
const dicts = computed<ArchDict[]>(() => (e.value?.dict ? [e.value.dict, ...(e.value.more ?? [])] : []))
const badge = computed(() => {
  const t = dicts.value.find(d => d.kind === 'term')
  return t ? `технічний термін ${t.date[0]}` : e.value?.status === 'dictionary' ? 'застаріле слово (за словником)' : 'неперевірений кандидат'
})
const epochs = computed(() => Object.entries(e.value?.epochs ?? {}).sort())
/** SPEC 63 CP-3: the corpus lines of the entry as KWIC (cut from the witness text), so the card carries the same blocks as a full card */
const lines = ref<Kwic[]>([]); let seq = 0
watch(e, async x => { const n = ++seq; const k = x ? await kwicFromRefs([...(x.first ? [x.first] : []), ...x.kwic], w => witnessById.value.get(w)?.date) : []; if (n === seq) lines.value = k }, { immediate: true })
const wits = computed(() => Object.entries(e.value?.witnesses ?? {}).sort((a, b) => b[1] - a[1]))
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← тексти</RouterLink></p>
  <p v-if="err" class="muted sans">{{ err }}</p>
  <div v-else-if="!found.ready" class="skeleton" style="height:4rem" />
  <p v-else-if="!e" class="muted sans">Архаїчної картки «{{ id }}» немає.</p>
  <template v-else>
    <h1>{{ e.head }} <small class="muted sans">{{ badge }}</small></h1>
    <PlastSenses :word="e.head" />
    <p v-if="e.status === 'unverified'" class="sans small"><b>Неперевірено:</b> повторюване нерозпізнане слово середньоукраїнського тексту (≥ 3 вживань); словникового запису для нього не знайдено, значення та частина мови — невідомо.</p>
    <template v-else-if="e.dict">
      <p class="sans small">Заголовне слово: <b>{{ e.head }}</b><template v-if="e.variants.length > 1"> · варіанти: {{ e.variants.slice(1).join(', ') }}</template><template v-if="e.dict.pos"> · частина мови за джерелом: {{ e.dict.pos }}.</template>
        <template v-if="e.dict.marks.length"> · позначки джерела: {{ e.dict.marks.join('; ') }}</template></p>
      <template v-for="d in dicts" :key="d.w">
        <blockquote class="sans small">«{{ d.quote }}» <span class="muted">— {{ wTitle(d.w) }}, {{ d.locator }}, {{ d.date[0] }} (<RouterLink :to="witnessTo(d.w)">{{ d.w }}</RouterLink>)</span></blockquote>
        <p v-if="d.gloss?.length" class="sans small"><span class="muted">Еквіваленти за списком: </span><template v-for="(g, i) in d.gloss" :key="i"><template v-if="i"> · </template><span v-if="d.gloss.length === 3" class="muted">{{ GLOSS_LANG[i] }} </span>{{ g }}</template></p>
      </template>
      <p class="sans small muted">{{ dicts.some(d => d.kind === 'term') ? 'Термін і еквіваленти — лише у цитованому рядку списку (транскрипція зі скану, не вичитана).' : 'Тлумачення — лише у цитованому заголовному рядку; повного тексту статті в базі немає (ліцензія).' }}</p>
    </template>
    <p class="sans small">Вживань у корпусі (без словника): {{ e.n }}<template v-if="!dicts.some(d => d.kind === 'term')"> · сучасного відповідника не зафіксовано</template>.</p>
    <p v-if="e.first" class="sans small">Перше вживання: <RouterLink :to="textTo(e.first.w, e.first.loc)">«{{ e.first.raw }}»</RouterLink> · {{ e.first.date[0] }}<template v-if="e.first.date[1] !== e.first.date[0]">–{{ e.first.date[1] }}</template> · <RouterLink :to="witnessTo(e.first.w)">{{ e.first.w }}</RouterLink></p>
    <h2>Написання</h2>
    <p class="sans"><span v-for="f in e.forms" :key="f.raw" class="chip">{{ f.raw }} ×{{ f.f }}</span><span v-if="!e.forms.length" class="muted small">лише в словнику</span></p>
    <template v-if="epochs.length">
      <h2>Епохи</h2>
      <p class="sans"><span v-for="[ep, n] in epochs" :key="ep" class="chip">{{ ep }} ×{{ n }}</span></p>
    </template>
    <template v-if="e.kwic.length">
      <h2>Приклади</h2>
      <ul class="sans small">
        <li v-for="(k, i) in e.kwic" :key="i"><RouterLink :to="textTo(k.w, k.loc)">«{{ k.raw }}»</RouterLink> · {{ k.loc }} · <RouterLink :to="witnessTo(k.w)">{{ k.w }}</RouterLink></li>
      </ul>
    </template>
    <WitnessBlock id="ar-wit" :items="wits.map(([w, n]) => ({ w, n }))" />   <!-- SPEC 63 CP-2: graph / list, empty state -->
    <ThinCard :lemma="e.head" :spelling="e.head" :kwic="lines" :f="e.n" :witnesses="e.witnesses" />
  </template>
</template>
