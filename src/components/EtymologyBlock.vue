<script setup lang="ts">
/**
 * ET word-card panel «Етимологія»: the extracted dictionary statements (Wiktionary, CC BY-SA, attributed; ЕСУМ ≤ 2-clause quotation with the goroh link) are shown apart from the
 * project's own `hypotheses`; the corpus-vs-dictionary dating conflict is a review prompt, never a correction.
 */
import { onMounted, ref, watch } from 'vue'
import { citeLabel, ukWiktRevUrl, ukWiktUrl } from '../../core/etymuk.ts'
import { CONFLICT_UK, LANG_UK, goroh, type Etymology, type EtymologyFile } from '../../core/etymology.ts'
import { etymologyOf } from '../lib/etymologyData.ts'
import { clipWords } from '../lib/format.ts'
import EvidenceList from './EvidenceList.vue'
import Panel from './Panel.vue'
const props = defineProps<{ lemma: string }>()
const entry = ref<Etymology>(), file = ref<EtymologyFile>(), done = ref(false)
const load = () => { done.value = false; etymologyOf(props.lemma).then(r => { entry.value = r.entry; file.value = r.file; done.value = true }) }
onMounted(load); watch(() => props.lemma, load)
const STATUS_UK = { proposed: 'запропонована', accepted: 'прийнята', rejected: 'відхилена' } as const
</script>

<template>
  <Panel id="h-ety" :open="false" title="Етимологія · Etymology" :empty="done && !entry" :summary="entry ? clipWords(entry.text || entry.chain?.[0]?.text || entry.uk?.t || 'є запис у словниках', 130) : 'завантаження…'"
    :info="entry ? `Вікісловник — ${file?.attribution.licence ?? 'CC BY-SA 4.0'}; витяг Wiktextract/kaikki.org. ЕСУМ цитується коротко, повний текст — на goroh.pp.ua.` : undefined">

    <template v-if="entry">
      <p v-if="entry.conflict" class="sans small" role="note" style="border-left:3px solid #b8860b;padding-left:.5rem">
        <strong>Розбіжність датувань ({{ entry.conflict }}).</strong> {{ CONFLICT_UK[entry.conflict] }}. <span class="muted">{{ entry.conflictNote }}</span></p>
      <p v-if="entry.aspect" class="sans small" data-testid="aspect-pair">видова пара: <template v-for="(p, i) in entry.aspect.partner" :key="p"><template v-if="i">, </template><RouterLink :to="'/w/' + encodeURIComponent(p)">{{ p }}</RouterLink></template> <span class="muted">({{ entry.aspect.asp === 'pf' ? 'це слово — доконаний вид' : 'це слово — недоконаний вид' }}; Вікісловник)</span></p>
      <h3 v-if="entry.text || entry.chain?.length" class="sans small muted">З словників (витягнуте, не гіпотеза проєкту)</h3>
      <p v-if="entry.text" class="sans" lang="en">{{ entry.text }}</p>
      <ul v-if="entry.chain?.length" class="sans small" style="list-style:none;padding:0;margin:0 0 .5rem" lang="en">
        <li v-for="(s, i) in entry.chain" :key="i"><span class="muted">{{ LANG_UK[s.rel] ?? s.rel }}: </span>{{ s.text }}</li>
      </ul>
      <section v-if="entry.uk" data-testid="etym-ukwikt">
        <h3 class="sans small muted">З uk.Вікісловника (окремо від en.Вікісловника; {{ file?.attribution.ukwikt?.licence ?? 'CC BY-SA 4.0' }})</h3>
        <p class="sans" lang="uk">{{ entry.uk.t }}</p>
        <p v-if="entry.uk.lo" class="sans small muted">Сторінка називає лише мову-джерело, без слова.</p>
        <p v-if="entry.uk.cites?.length" class="sans small" data-testid="etym-ukwikt-cites">Названо на сторінці: {{ entry.uk.cites.map(citeLabel).join('; ') }}. <span class="muted">Це вказівник, а не наше прочитання ЕСУМ.</span></p>
        <p class="sans small muted"><a :href="ukWiktUrl(lemma)" target="_blank" rel="noopener">сторінка ↗</a><template v-if="entry.uk.rev"> · <a :href="ukWiktRevUrl(entry.uk.rev)" target="_blank" rel="noopener">версія {{ entry.uk.rev }} ↗</a> ({{ (entry.uk.ts ?? '').slice(0, 10) }})</template><template v-if="file?.attribution.ukwikt"> · дамп {{ file.attribution.ukwikt.date }}</template> · автори — в історії сторінки</p>
      </section>
      <EvidenceList :evidence="entry.sources" />
      <p class="small muted sans">Про ЕСУМ: <RouterLink to="/source/ESUM">картка джерела</RouterLink> · <a :href="goroh(lemma)" target="_blank" rel="noopener">оригінал (goroh.pp.ua) ↗</a></p>
    </template>
    <p v-else-if="done" class="sans small muted">У зібраних словниках етимології цього слова немає. ЕСУМ: <a :href="goroh(lemma)" target="_blank" rel="noopener">goroh.pp.ua ↗</a>.</p>
    <p v-else class="muted small">завантаження…</p>
    <template v-if="entry?.family?.length">
      <h3 class="sans small muted" style="margin-top:.7rem">Родина слова</h3>
      <ul class="sans small">
        <li v-for="f in entry.family" :key="f.lemma"><RouterLink v-if="f.inLexicon" :to="'/w/' + encodeURIComponent(f.lemma)">{{ f.lemma }}</RouterLink><template v-else>{{ f.lemma }}</template> · {{ f.rel }} · <em>{{ f.basis === 'vesum' ? 'за записами VESUM' : 'гіпотеза, чекає на цитату зі словника' }}</em><EvidenceList :evidence="f.evidence" /></li>
      </ul>
    </template>
    <h3 class="sans small muted" style="margin-top:.7rem">Гіпотези проєкту (hypotheses)</h3>
    <ul v-if="entry?.hypotheses.length" class="sans small">
      <li v-for="(h, i) in entry.hypotheses" :key="i"><strong>{{ h.author }}</strong> · {{ STATUS_UK[h.status] }} · {{ h.date }}<br />{{ h.text }}<EvidenceList :evidence="h.evidence" /></li>
    </ul>
    <p v-else class="sans small muted">Гіпотез проєкту для цього слова ще немає; їх можна додати окремо від словникового змісту.</p>
  </Panel>
</template>
