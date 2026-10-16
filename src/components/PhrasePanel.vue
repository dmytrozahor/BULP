<script setup lang="ts">
/** BL-12 word-card panel «Сталі сполучення»: phraseme candidates containing this lemma (model, P-1.7), every component word clickable. */
import { computed } from 'vue'
import { phrasesFor, phrasesOf } from '../lib/datasets.ts'
import PhraseWords from './PhraseWords.vue'
import { phraseTo } from '../lib/nav.ts'
import Panel from './Panel.vue'
const props = defineProps<{ lemma: string }>()
const data = computed(() => phrasesFor(props.lemma))   // PF-1: per-lemma shard, not phrases.json
const rows = computed(() => phrasesOf(data.value, props.lemma).slice(0, 15))
</script>
<template>
  <Panel id="h-phr" :open="false" title="Сталі сполучення" :summary="data ? `${rows.length} кандидатів (модель)` : 'завантаження…'" :empty="!!data && !rows.length"
    info="Кандидати — модель: асоціація (logDice) × архаїчність (частка пам’яток до 1400/1600, цсл. ознаки, повтор у різних пам’ятках). Це не словникові факти.">
    <ul class="sans small"><li v-for="p in rows" :key="p.lemmas.join('|')"><PhraseWords :lemmas="p.lemmas" /> <span class="muted">· f={{ p.f }} · {{ p.nW }} пам. · {{ p.dates[0] }}–{{ p.dates[1] }} · {{ p.score.toFixed(2) }}</span> <RouterLink v-if="p.id" :to="phraseTo(p.id)">сторінка</RouterLink></li></ul>
    <RouterLink to="/phrases" class="small sans">усі сполучення →</RouterLink>
  </Panel>
</template>
