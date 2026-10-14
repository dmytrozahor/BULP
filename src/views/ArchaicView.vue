<script setup lang="ts">
/**
 * SPEC 63 AR-1/AR-2 /ar/:id — card of an archaic lemma: a headword of the historical dictionary (BL-11) that VESUM does not know, or an `unverified` recurring unresolved cluster.
 * Everything shown is the dictionary's own header line (quote + locator) and the corpus lines; what no source states is «невідомо».
 */
import { computed, ref, watch } from 'vue'
import type { ArchEntry, ArchFile } from '../../core/archaic.ts'
import { loadArchaic } from '../lib/torotData.ts'
import { textTo, witnessTo } from '../lib/nav.ts'
const props = defineProps<{ id: string }>()
const file = ref<ArchFile>(), err = ref('')
watch(() => props.id, () => { loadArchaic().then(f => (file.value = f), e => (err.value = String(e))) }, { immediate: true })
const e = computed<ArchEntry | undefined>(() => file.value?.entries.find(x => x.id === props.id))
const epochs = computed(() => Object.entries(e.value?.epochs ?? {}).sort())
const wits = computed(() => Object.entries(e.value?.witnesses ?? {}).sort((a, b) => b[1] - a[1]))
</script>

<template>
  <p class="small sans"><RouterLink to="/texts">← тексти</RouterLink></p>
  <p v-if="err" class="muted sans">{{ err }}</p>
  <div v-else-if="!file" class="skeleton" style="height:4rem" />
  <p v-else-if="!e" class="muted sans">Архаїчної картки «{{ id }}» немає.</p>
  <template v-else>
    <h1>{{ e.head }} <small class="muted sans">{{ e.status === 'dictionary' ? 'застаріле слово (за словником)' : 'неперевірений кандидат' }}</small></h1>
    <p v-if="e.status === 'unverified'" class="sans small"><b>Неперевірено:</b> повторюване нерозпізнане слово середньоукраїнського тексту (≥ 3 вживань); словникового запису для нього не знайдено, значення та частина мови — невідомо.</p>
    <template v-else-if="e.dict">
      <p class="sans small">Заголовне слово: <b>{{ e.head }}</b><template v-if="e.variants.length > 1"> · варіанти: {{ e.variants.slice(1).join(', ') }}</template><template v-if="e.dict.pos"> · частина мови за джерелом: {{ e.dict.pos }}.</template>
        <template v-if="e.dict.marks.length"> · позначки джерела: {{ e.dict.marks.join('; ') }}</template></p>
      <blockquote class="sans small">«{{ e.dict.quote }}» <span class="muted">— Словник староукраїнської мови XIV–XV ст., {{ e.dict.locator }} (<RouterLink :to="witnessTo(e.dict.w)">{{ e.dict.w }}</RouterLink>)</span></blockquote>
      <p class="sans small muted">Тлумачення — лише у цитованому заголовному рядку; повного тексту статті в базі немає (ліцензія).</p>
    </template>
    <p class="sans small">Вживань у корпусі (без словника): {{ e.n }} · сучасного відповідника не зафіксовано.</p>
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
    <p v-if="wits.length" class="sans small muted">Тексти: <template v-for="([w, n], i) in wits" :key="w"><template v-if="i">, </template><RouterLink :to="witnessTo(w)">{{ w }}</RouterLink> ×{{ n }}</template></p>
  </template>
</template>
