<script setup lang="ts">
/**
 * Instant search over lemmas AND every historical spelling / paradigm form (stress- and case-insensitive via core/text.ts key();
 * Old letters ѣ ъ ы ѧ accepted). Results: lemma, first-attestation year + author, dots barometer. Unknown → /analyze.
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isKnown } from '../../core/evidence.ts'
import { search } from '../lib/search.ts'
import { authorInfo, useData } from '../composables/useData.ts'
import { fmtDate, fmtNum } from '../lib/format.ts'
import Dots from '../components/Dots.vue'
const { loaded, loading, byLemma, searchIdx, cards, corpus, witnessById } = useData()
const route = useRoute(), router = useRouter()
const q = ref(String(route.query.q ?? ''))
const results = computed(() => (q.value.trim() ? search(searchIdx.value, q.value) : []))
const rows = computed(() => results.value.map(r => {
  const c = byLemma.value.get(r.lemma)!
  const fa = isKnown(c.first) ? c.first.value : undefined
  return { r, c, fa, who: fa ? authorInfo(fa.author, witnessById.value.get(fa.witness)).name : '' }
}))
const go = () => rows.value[0] && router.push(`/w/${encodeURIComponent(rows.value[0].c.lemma)}`)
const shown = ref(300)   // F2: the full lemma list is paged, never rendered at once (thousands of nodes)
const viaUk = { lemma: 'лема', form: 'історична форма', paradigm: 'словоформа' } as const
</script>

<template>
  <section class="hero">
    <h1>Звідки слово?</h1>
    <p class="muted">Лексикон словоформ із доказами: перша фіксація, історичні написання, мітки (церковнослов’янське, суржик, діалектне, розмовне) — кожна з джерелом і цитатою.
      <span class="sans small">Where does a Ukrainian word come from — every claim with its evidence.</span></p>
    <input v-model="q" type="search" placeholder="Знайти слово: князь, кънѧзь, видѣти, шо…" aria-label="Пошук слова" autofocus autocomplete="off" spellcheck="false" @keydown.enter="go" />
    <p class="small muted sans">Без урахування наголосу й регістру; приймає ѣ ъ ы ѧ. <template v-if="corpus">Корпус: {{ fmtNum(corpus.N) }} слів, {{ cards.length }} лем у словнику.</template></p>
  </section>

  <div v-if="!loaded"><div class="skeleton" v-for="i in 4" :key="i" /></div>
  <ul v-else-if="rows.length" class="results" aria-live="polite">
    <li v-for="{ r, c, fa, who } in rows" :key="c.lemma">
      <RouterLink :to="`/w/${encodeURIComponent(c.lemma)}`">
        <span class="lem">{{ c.lemma }}</span>
        <span class="muted small sans">{{ c.pos }}</span>
        <span v-if="r.matched !== c.lemma" class="small sans">знайдено: «{{ r.matched }}» ({{ viaUk[r.via] }})</span>
        <span v-if="fa" class="small sans">перша фіксація <strong>{{ fmtDate(fa.date) }}</strong> · {{ who }}</span>
        <span v-else class="unk">перша фіксація невідома</span>
        <Dots :dots="c.stats.dots" :ipm="c.stats.ipm" :hk="c.stats.hk" :f="c.stats.f" :N="corpus?.N" />
      </RouterLink>
    </li>
  </ul>
  <div v-else-if="q.trim() && loaded" class="card">
    <p>У словнику немає «<strong>{{ q }}</strong>».</p>
    <p><RouterLink :to="{ path: '/analyze', query: { q } }">Проаналізувати це слово в браузері →</RouterLink> <span class="muted small">(правила виведення, церковнослов’янські/контактні/діалектні ознаки — лише з доказами)</span></p>
  </div>
  <div v-else-if="loaded" class="card">
    <h2>Усі леми ({{ cards.length }}, показано {{ Math.min(shown, cards.length) }})</h2>
    <div class="chips"><RouterLink v-for="c in cards.slice(0, shown)" :key="c.lemma" class="chip" :to="`/w/${encodeURIComponent(c.lemma)}`" style="text-decoration:none">{{ c.lemma }}</RouterLink></div>
    <button v-if="shown < cards.length" type="button" class="btn" style="margin-top:.6rem" @click="shown += 600">Показати ще ({{ cards.length - shown }})</button>
    <p class="small muted sans" style="margin-top:.8rem">Спробуйте <a href="#/annotate">анотатор тексту</a> на прикладах із пам’яток корпусу.</p>
  </div>
</template>
