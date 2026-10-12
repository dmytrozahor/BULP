<script setup lang="ts">
/**
 * ET word-card panel «Етимологія»: the extracted dictionary statements (Wiktionary, CC BY-SA, attributed; ЕСУМ ≤ 2-clause quotation with the goroh link) are shown apart from the
 * project's own `hypotheses`; the corpus-vs-dictionary dating conflict is a review prompt, never a correction.
 */
import { onMounted, ref, watch } from 'vue'
import { CONFLICT_UK, LANG_UK, goroh, type Etymology, type EtymologyFile } from '../../core/etymology.ts'
import { etymologyOf } from '../lib/etymologyData.ts'
import EvidenceList from './EvidenceList.vue'
const props = defineProps<{ lemma: string }>()
const entry = ref<Etymology>(), file = ref<EtymologyFile>(), done = ref(false)
const load = () => { done.value = false; etymologyOf(props.lemma).then(r => { entry.value = r.entry; file.value = r.file; done.value = true }) }
onMounted(load); watch(() => props.lemma, load)
const STATUS_UK = { proposed: 'запропонована', accepted: 'прийнята', rejected: 'відхилена' } as const
</script>

<template>
  <section class="card" aria-labelledby="h-ety">
    <h2 id="h-ety"><span>Етимологія · Etymology</span></h2>
    <template v-if="entry">
      <p v-if="entry.conflict" class="sans small" role="note" style="border-left:3px solid #b8860b;padding-left:.5rem">
        <strong>Розбіжність датувань ({{ entry.conflict }}).</strong> {{ CONFLICT_UK[entry.conflict] }}. <span class="muted">{{ entry.conflictNote }}</span></p>
      <h3 class="sans small muted">З словників (витягнуте, не гіпотеза проєкту)</h3>
      <p v-if="entry.text" class="sans" lang="en">{{ entry.text }}</p>
      <ul v-if="entry.chain?.length" class="sans small" style="list-style:none;padding:0;margin:0 0 .5rem" lang="en">
        <li v-for="(s, i) in entry.chain" :key="i"><span class="muted">{{ LANG_UK[s.rel] ?? s.rel }}: </span>{{ s.text }}</li>
      </ul>
      <EvidenceList :evidence="entry.sources" />
      <p class="small muted sans">Вікісловник — {{ file?.attribution.licence ?? 'CC BY-SA 4.0' }}; витяг Wiktextract/kaikki.org. ЕСУМ цитується коротко, повний текст — на <a :href="goroh(lemma)" target="_blank" rel="noopener">goroh.pp.ua</a>.</p>
    </template>
    <p v-else-if="done" class="sans small muted">У зібраних словниках етимології цього слова немає. ЕСУМ: <a :href="goroh(lemma)" target="_blank" rel="noopener">goroh.pp.ua ↗</a>.</p>
    <p v-else class="muted small">завантаження…</p>
    <h3 class="sans small muted" style="margin-top:.7rem">Гіпотези проєкту (hypotheses)</h3>
    <ul v-if="entry?.hypotheses.length" class="sans small">
      <li v-for="(h, i) in entry.hypotheses" :key="i"><strong>{{ h.author }}</strong> · {{ STATUS_UK[h.status] }} · {{ h.date }}<br />{{ h.text }}<EvidenceList :evidence="h.evidence" /></li>
    </ul>
    <p v-else class="sans small muted">Гіпотез проєкту для цього слова ще немає; їх можна додати окремо від словникового змісту.</p>
  </section>
</template>
