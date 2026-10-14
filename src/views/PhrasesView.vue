<script setup lang="ts">
/**
 * BL-12 `/phrases`: ranked phraseme candidates (model: collocation + archaism, P-1.7 — never a dictionary fact), filter by epoch, and the separate class
 * «засвідчений фразеологізм» (uk.wiktionary categories, CC BY-SA 4.0). Every component word is a link (→ /w, → /f); every witness → /witness/:id.
 */
import { computed, ref } from 'vue'
import { usePhrases } from '../lib/datasets.ts'
import { PHRASE_EPOCHS, phraseInEpoch } from '../../core/phrasemes.ts'
import { witnessTo } from '../lib/nav.ts'
import PhraseWords from '../components/PhraseWords.vue'
import { phraseTo } from '../lib/nav.ts'
import { usePage } from '../composables/usePage.ts'
import { PAGE_SIZE } from '../lib/page.ts'
import Pagination from '../components/Pagination.vue'
const data = usePhrases()
const epoch = ref<string>('all'), tab = ref<'top' | 'graffiti' | 'frames'>('top')   // BL-12b tab «формули графіті»
const rows = computed(() => { const m = PHRASE_EPOCHS.find(e => e.id === epoch.value)!.max; return (tab.value === 'graffiti' ? data.value?.formulas ?? [] : tab.value === 'frames' ? data.value?.frames ?? [] : data.value?.candidates ?? []).filter(p => phraseInEpoch(p, m)) })
/** SPEC 63 NV-1: candidates `?p=`, засвідчені `?pa=`, словникові `?pd=`; a filter change returns to page 1 */
const total = computed(() => rows.value.length)
const pg = usePage(total), pa = usePage(computed(() => data.value?.attested.length ?? 0), PAGE_SIZE, 'pa'), pd = usePage(computed(() => data.value?.dict?.length ?? 0), PAGE_SIZE, 'pd')
const setEpoch = (id: string) => { epoch.value = id; pg.go(1) }
const setTab = (t: 'top' | 'graffiti' | 'frames') => { tab.value = t; pg.go(1) }
</script>
<template>
  <section>
    <h1>Сталі сполучення</h1>
    <p class="muted sans small">{{ data?.note }}</p>
    <p v-if="!data" class="muted" role="status">Завантаження…</p>
    <template v-else>
      <div class="row sans small" role="group" aria-label="Фільтр за епохою">
        <button v-for="e in PHRASE_EPOCHS" :key="e.id" type="button" class="chip" :aria-pressed="epoch === e.id" @click="setEpoch(e.id)">{{ e.label }}</button>
      </div>
      <div class="row sans small" role="group" aria-label="Список">
        <button type="button" class="chip" :aria-pressed="tab === 'top'" @click="setTab('top')">сполучення (≥ 2 родини джерел)</button>
        <button type="button" class="chip" :aria-pressed="tab === 'graffiti'" @click="setTab('graffiti')">формули графіті ({{ data.formulas?.length ?? 0 }})</button>
        <button type="button" class="chip" :aria-pressed="tab === 'frames'" @click="setTab('frames')">шаблони ({{ data.frames?.length ?? 0 }})</button>
      </div>
      <p v-if="tab === 'frames'" class="muted sans small">Налагоджувальний список: службові рамки («і син і», «на ~нъ і») — не словосполучення; змістове ядро («вся земля») рахується окремо у списку «сполучення».</p>
      <p v-if="tab === 'graffiti'" class="muted sans small">Повтори в межах однієї родини джерел (усі написи Софії — одна родина; редакції одного літопису — одна): формульні, але не незалежні свідчення.</p>
      <h2 class="small sans">{{ tab === 'top' ? 'Кандидати' : tab === 'frames' ? 'Шаблони (службові рамки)' : 'Формули графіті' }} <span class="badge">модель · {{ data.method }}</span> <span class="muted">{{ rows.length }}</span></h2>
      <div class="tablewrap"><table class="sans small">
        <thead><tr><th>#</th><th>сполучення (леми)</th><th>написання</th><th class="num">f</th><th>родини</th><th>пам’ятки</th><th>роки</th><th></th><th class="num">оцінка</th></tr></thead>
        <tbody><tr v-for="(p, i) in pg.slice(rows)" :key="p.lemmas.join('|')">
          <td>{{ (pg.page.value - 1) * PAGE_SIZE + i + 1 }}</td>
          <td><PhraseWords :lemmas="p.lemmas" /><span v-if="p.attested" class="badge" title="збігається із засвідченим фразеологізмом"> засвідчений</span></td>
          <td class="old">{{ p.spellings[0] }}</td><td class="num">{{ p.f }}</td>
          <td>{{ p.nF }}</td>
          <td><template v-for="(w, j) in p.witnesses.slice(0, 3)" :key="w"><template v-if="j">, </template><RouterLink :to="witnessTo(w)">{{ w }}</RouterLink></template><template v-if="p.nW > 3"> +{{ p.nW - 3 }}</template></td>
          <td>{{ p.dates[0] }}–{{ p.dates[1] }}</td>
          <td><RouterLink v-if="p.id" :to="phraseTo(p.id)" class="small">сторінка</RouterLink></td>
          <td class="num" :title="`logDice ${p.components.logDice}, MI ${p.components.mi}, до 1400: ${p.components.pre1400}, до 1600: ${p.components.pre1600}, цсл./стара орф.: ${p.components.old}, архаїчність ${p.components.archaism}`">{{ p.score.toFixed(2) }}</td>
        </tr></tbody></table></div>
      <Pagination :page="pg.page.value" :pages="pg.pages.value" :total="rows.length" @go="pg.go" />
      <h2 class="small sans">Засвідчені фразеологізми <span class="badge">словник</span> <span class="muted">{{ data.attested.length }}</span></h2>
      <p class="muted sans small">Джерело: {{ data.attestedSource.name }}, {{ data.attestedSource.licence }}, станом на {{ data.attestedSource.retrieved }}.</p>
      <ul class="sans small"><li v-for="(t, i) in pa.slice(data.attested)" :key="t"><PhraseWords :lemmas="t.toLowerCase().split(/\s+/)" /> <RouterLink v-if="data.attestedIds?.[(pa.page.value - 1) * PAGE_SIZE + i]" :to="phraseTo(data.attestedIds[(pa.page.value - 1) * PAGE_SIZE + i]!)" class="muted">сторінка</RouterLink></li></ul>
      <Pagination :page="pa.page.value" :pages="pa.pages.value" @go="pa.go" />
      <template v-if="data.dict?.length"><h2 class="small sans">Словникові прислів’я та сполучення <span class="badge">en.wiktionary, CC BY-SA 4.0</span> <span class="muted">{{ data.dict.length }}</span></h2>
        <ul class="sans small"><li v-for="d in pd.slice(data.dict)" :key="d.id"><RouterLink :to="phraseTo(d.id)">{{ d.t }}</RouterLink></li></ul>
        <Pagination :page="pd.page.value" :pages="pd.pages.value" @go="pd.go" /></template>
    </template>
  </section>
</template>
