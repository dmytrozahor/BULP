<script setup lang="ts">
/**
 * SPEC 63 PH `/p/:id`: one page per phraseme with the components of a linguistic analysis. SPEC 00: every statement carries its source and locator;
 * what no source provides is «невідомо» (never guessed). Candidates are a model (P-1.7) and are labelled so.
 */
import { computed, ref, watchEffect } from 'vue'
import { loadPhraseDetail, phraseById, usePhrases } from '../lib/datasets.ts'
import { phraseTo, witnessTo } from '../lib/nav.ts'
import { phraseVariants, relatedBy, syntaxPattern, type PhraseDetail } from '../../core/phraseme-pages.ts'
import { idiomWords, type Phraseme } from '../../core/phrasemes.ts'
import { useData } from '../composables/useData.ts'
import PhraseWords from '../components/PhraseWords.vue'
import Kwic from '../components/Kwic.vue'
import AttestGraph from '../components/AttestGraph.vue'
const props = defineProps<{ id: string }>()
const data = usePhrases(), { byLemma } = useData()
const detail = ref<PhraseDetail>(), failed = ref(false)
watchEffect(() => { detail.value = undefined; failed.value = false; loadPhraseDetail(props.id).then(d => { detail.value = d }).catch(() => { failed.value = true }) })
const cand = computed(() => phraseById(data.value, props.id))
const all = computed(() => [...(data.value?.candidates ?? []), ...(data.value?.formulas ?? [])])
const title = computed(() => detail.value?.title ?? cand.value?.attested ?? cand.value?.lemmas.map(l => l.replace(/^~/, '')).join(' ') ?? '')
const words = computed(() => cand.value?.lemmas ?? idiomWords(detail.value?.title ?? ''))
const pos = computed(() => words.value.map((l, i) => detail.value?.pos?.[i] || (l.startsWith('~') ? '' : byLemma.value.get(l)?.pos ?? '')))
const pattern = computed(() => syntaxPattern(pos.value))
const variants = computed(() => (cand.value ? phraseVariants(cand.value, all.value) : { order: [], lexical: [] }))
const related = computed(() => (cand.value ? relatedBy(cand.value, all.value) : []))
const ev = computed(() => detail.value?.evidence)
const points = computed(() => Object.entries(ev.value?.byCentury ?? {}).map(([c, f]) => ({ id: 'c' + c, label: `${c} ст.`, year: (Number(c) - 1) * 100 + 50, f, kind: 'epoch', to: phraseTo(props.id), title: `${c} століття` })))
const label = (p: Phraseme) => p.lemmas.map(l => l.replace(/^~/, '')).join(' ')
</script>
<template>
  <section>
    <p class="small sans"><RouterLink to="/phrases">← усі сполучення</RouterLink></p>
    <h1>{{ title || 'Сполучення' }}</h1>
    <p v-if="failed" class="muted" role="status">Не вдалося завантажити дані сполучення.</p>
    <p v-else-if="!data || !detail" class="muted" role="status">Завантаження…</p>
    <template v-else>
      <p class="sans small"><span class="badge">{{ detail.kind === 'candidate' ? 'модель · ' + data.method : detail.kind === 'attested' ? 'засвідчений фразеологізм · словник' : 'словник' }}</span> <span class="muted">id {{ id }}</span></p>

      <h2 class="small sans">PH-1 · Склад і значення</h2>
      <div class="tablewrap"><table class="sans small">
        <thead><tr><th>#</th><th>компонент</th><th>частина мови (VESUM)</th></tr></thead>
        <tbody><tr v-for="(w, i) in words" :key="i"><td>{{ i + 1 }}</td><td><PhraseWords :lemmas="[w]" /></td><td>{{ pos[i] || 'невідомо' }}</td></tr></tbody>
      </table></div>
      <dl class="sans small">
        <dt>Синтаксична схема</dt><dd><template v-if="pattern">{{ pattern }} <span class="muted">· обчислено з частин мови компонентів</span></template><span v-else class="muted">невідомо</span></dd>
        <dt>Значення</dt>
        <dd><template v-if="detail.gloss?.length"><div v-for="(g, i) in detail.gloss" :key="i">«{{ g.text }}» <span class="muted">· {{ g.src }}, {{ g.licence }} · {{ g.loc }}</span></div></template><span v-else class="muted">невідомо</span></dd>
        <dt>Походження</dt>
        <dd><template v-if="detail.etymology?.length"><div v-for="(g, i) in detail.etymology" :key="i">«{{ g.text }}» <span class="muted">· {{ g.src }}, {{ g.licence }} · {{ g.loc }}</span></div></template><span v-else class="muted">невідомо</span></dd>
        <dt>Тип походження (біблійне, античне, народне, калька…)</dt><dd><span class="muted">невідомо — указується лише за прямим твердженням джерела</span></dd>
        <dt>Реєстр / вжиток / діалект</dt>
        <dd><template v-if="detail.tags?.length"><span v-for="(g, i) in detail.tags" :key="i" class="badge" :title="`${g.src}, ${g.licence} · ${g.loc}`">{{ g.text }}</span></template><span v-else class="muted">невідомо</span></dd>
      </dl>

      <h2 class="small sans">PH-2 · Свідчення корпусу</h2>
      <template v-if="ev">
        <p class="sans small">Усього уживань у корпусі: <b>{{ ev.n }}</b><template v-if="cand"> · родини джерел: {{ cand.nF }} ({{ cand.families.join(', ') }}) · пам’ятки: {{ cand.nW }}</template>
          <template v-if="ev.earliest"> · найраніше: {{ ev.earliest.date[0] }}–{{ ev.earliest.date[1] }}, <RouterLink :to="witnessTo(ev.earliest.w)">{{ ev.earliest.w }}</RouterLink> ({{ ev.earliest.loc }})</template></p>
        <h3 class="small sans">Частота за століттями</h3>
        <AttestGraph :points="points" label="Частота сполучення за століттями" />
        <h3 class="small sans">Конкорданс</h3>
        <Kwic :lines="ev.kwic" plain />
      </template>
      <p v-else class="sans small"><span class="muted">невідомо</span> — у розібраному корпусі сполучення не знайдено (немає й ранньої атестації).</p>
      <template v-if="cand">
        <p class="sans small"><b>Варіанти порядку компонентів</b> <span class="muted">(кандидати, модель)</span>:
          <template v-if="variants.order.length"><template v-for="(q, i) in variants.order" :key="i"><template v-if="i">; </template><RouterLink :to="phraseTo(q.id!)">{{ label(q) }}</RouterLink></template></template><span v-else class="muted">невідомо</span></p>
        <p class="sans small"><b>Лексичні варіанти</b> <span class="muted">(одна лема інша, кандидати, модель)</span>:
          <template v-if="variants.lexical.length"><template v-for="(q, i) in variants.lexical" :key="i"><template v-if="i">; </template><RouterLink :to="phraseTo(q.id!)">{{ label(q) }}</RouterLink></template></template><span v-else class="muted">невідомо</span></p>
        <p v-if="cand.spellings.length" class="sans small"><b>Написання</b>: <span class="old">{{ cand.spellings.join(' · ') }}</span></p>
      </template>

      <h2 class="small sans">PH-3 · Зв’язки</h2>
      <dl class="sans small">
        <dt>Відповідники в інших мовах</dt>
        <dd><template v-if="detail.gloss?.length"><div v-for="(g, i) in detail.gloss" :key="i">англ.: «{{ g.text }}» <span class="muted">· {{ g.src }}, {{ g.licence }} · {{ g.loc }}</span></div></template><span v-else class="muted">невідомо</span></dd>
        <dt>Споріднені фразеологізми (когнати)</dt><dd><span class="muted">невідомо</span></dd>
        <dt>Синоніми</dt>
        <dd><template v-if="detail.synonyms?.length"><span v-for="(g, i) in detail.synonyms" :key="i" :title="`${g.src}, ${g.licence} · ${g.loc}`"><template v-if="i">, </template>{{ g.text }}</span></template><span v-else class="muted">невідомо</span></dd>
        <dt>Спільні компоненти</dt>
        <dd><template v-if="related.length"><template v-for="(q, i) in related" :key="i"><template v-if="i">; </template><RouterLink :to="phraseTo(q.id!)">{{ label(q) }}</RouterLink></template></template><span v-else class="muted">невідомо</span></dd>
        <dt>Оцінки (модель)</dt>
        <dd><template v-if="cand">logDice {{ cand.components.logDice }} · MI {{ cand.components.mi }} · архаїчність {{ cand.components.archaism }} (до 1400: {{ cand.components.pre1400 }}, до 1600: {{ cand.components.pre1600 }}, цсл./стара орф.: {{ cand.components.old }}) · підсумок {{ cand.score.toFixed(2) }}
          <div class="muted">Метод {{ cand.method }}: logDice (Rychlý 2008) × (0,1 + архаїчність) × min(3, log₂(1 + родини джерел)); це оцінка моделі, а не словниковий факт.</div></template><span v-else class="muted">невідомо — оцінки є лише в кандидатів із корпусу</span></dd>
      </dl>
    </template>
  </section>
</template>
