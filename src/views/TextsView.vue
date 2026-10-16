<script setup lang="ts">
import { isOldForm } from '../lib/nav.ts'
/**
 * /texts[?w=<witness>[&p=<page>]] — U-8 corpus reader: all witnesses of corpus.json (filter by epoch / author / region), and a witness's running text
 * annotated with the existing annotate() pipeline, PAGE_SIZE tokens at a time (paged, so a long chronicle never renders at once).
 * Data contract: running text lives in public/data/texts/<witness>.json = { tokens: [raw, loc, s][] } (s = the separator that follows the token, '' or ' ' / true|false),
 * produced later by the backend. Until that file exists the reader shows the witness's own KWIC examples (from the detail shards of its lemmas is not loaded here;
 * the fixture/real core has none per witness) and says so — it never invents text.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isKnown } from '../../core/evidence.ts'
import { findLoc, loadTokens, rowRef, rowsOf, type Tok } from '../lib/witnessText.ts'
import { epochTo, witnessTo, wordTo }  from '../lib/nav.ts'
import { epochShort, fmtDate, fmtNum, LANG_UK } from '../lib/format.ts'
import { sourceLink } from '../lib/source.ts'
import { authorInfo, useData } from '../composables/useData.ts'
import AuthorBadge from '../components/AuthorBadge.vue'
import Pagination from '../components/Pagination.vue'
import { usePage } from '../composables/usePage.ts'
const PAGE_SIZE = 200
const route = useRoute(), router = useRouter()
const { corpus, loaded, annData, witnessById, ensureCorpus } = useData()
ensureCorpus()   // PF: the witness list is the whole corpus.json, fetched by the pages that list witnesses
const ep = ref(''), au = ref(''), rg = ref('')
const epochOf = (w: NonNullable<typeof corpus.value>['witnesses'][number]) => (isKnown(w.epochShev) ? w.epochShev.value.epochs[0]! : 'unknown')
const all = computed(() => corpus.value?.witnesses ?? [])
const epochs = computed(() => [...new Set(all.value.map(epochOf))])
const authors = computed(() => [...new Set(all.value.map(w => w.author))].map(a => ({ id: a, name: authorInfo(a).name })))
const regions = computed(() => [...new Set(all.value.map(w => w.region).filter(Boolean) as string[])])
const list = computed(() => all.value.filter(w => (!ep.value || epochOf(w) === ep.value) && (!au.value || w.author === au.value) && (!rg.value || w.region === rg.value)))
/** SPEC 63 NV-1: the witness list is paged (`?p=`, 50 per page; in the reader `?p=` stays the token page) */
const lp = usePage(computed(() => list.value.length))
watch([ep, au, rg], () => { if (route.query.p !== undefined && route.query.w === undefined) lp.go(1) })
const cur = computed(() => witnessById.value.get(String(route.query.w ?? '')))
const locQ = computed(() => String(route.query.loc ?? ''))
/** BL-16: a locator in the URL (?loc=) opens the page that holds it unless ?p= says otherwise */
const locIdx = computed(() => (Array.isArray(toks.value) && locQ.value ? findLoc(toks.value, locQ.value) : -1))
const page = computed(() => (route.query.p !== undefined ? Math.max(0, (+String(route.query.p) || 0)) : locIdx.value >= 0 ? Math.floor(locIdx.value / PAGE_SIZE) : 0))
const isHit = (loc: string) => !!locQ.value && (loc === locQ.value || loc.startsWith(locQ.value))
const open = (id: string) => router.push({ path: '/texts', query: { w: id } })
const turn = (p: number) => router.push({ path: '/texts', query: { w: cur.value!.id, p: String(p) } })

const toks = ref<Tok[] | null | 'loading'>(null)
watch(() => cur.value?.id, async id => {
  toks.value = null; if (!id) return
  toks.value = 'loading'
  const t = await loadTokens(id); if (id === cur.value?.id) toks.value = t
}, { immediate: true })
const total = computed(() => (Array.isArray(toks.value) ? toks.value.length : 0))
const rows = computed(() => (!Array.isArray(toks.value) || !loaded.value ? [] : rowsOf(toks.value, page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE, annData.value)))
watch([locIdx, () => rows.value.length], async () => { if (locIdx.value < 0) return; await nextTick(); document.querySelector('.tok.hit')?.scrollIntoView({ block: 'center' }) })
const locLink = (loc: string, raw: string) => sourceLink(cur.value, loc, { node: raw })
</script>

<template>
  <h1>Тексти корпусу</h1>
  <div v-if="!loaded"><div class="skeleton" v-for="i in 4" :key="i" /></div>
  <template v-else-if="!cur">
    <p class="muted">Усі пам’ятки корпусу. Відкрийте пам’ятку, щоб прочитати її текст з анотацією (кожне слово веде до картки леми).</p>
    <div class="row sans small" role="group" aria-label="Фільтри">
      <select v-model="ep" aria-label="Епоха"><option value="">усі епохи</option><option v-for="e in epochs" :key="e" :value="e">{{ epochShort(e) }}</option></select>
      <select v-model="au" aria-label="Автор"><option value="">усі автори</option><option v-for="a in authors" :key="a.id" :value="a.id">{{ a.name }}</option></select>
      <select v-model="rg" aria-label="Регіон"><option value="">усі регіони</option><option v-for="r in regions" :key="r" :value="r">{{ r }}</option></select>
      <span class="muted">{{ list.length }} із {{ all.length }}</span>
    </div>
    <ul class="witlist" style="list-style:none;padding:0">
      <li v-for="w in lp.slice(list)" :key="w.id" class="card" style="margin:.5rem 0">
        <button type="button" class="chip" @click="open(w.id)"><strong>{{ w.title }}</strong></button> <RouterLink class="small sans" :to="witnessTo(w.id)">картка →</RouterLink>
        <div class="small sans"><AuthorBadge :author="w.author" :witness="w.id" /> · {{ fmtDate(w.date) }} · <RouterLink :to="epochTo(epochOf(w))">{{ epochShort(epochOf(w)) }}</RouterLink><template v-if="w.region"> · {{ w.region }}</template> · {{ LANG_UK[w.lang] }} · {{ fmtNum(w.n) }} слів
          · <a :href="w.url" target="_blank" rel="noopener">оригінал ↗</a></div>
        <div v-if="w.licenceNote" class="small sans muted" role="note">{{ w.licenceNote }}</div>
      </li>
    </ul>
    <Pagination :page="lp.page.value" :pages="lp.pages.value" :total="list.length" @go="lp.go" />
  </template>
  <template v-else>
    <p><RouterLink to="/texts">← усі пам’ятки</RouterLink></p>
    <h2>{{ cur.title }}</h2>
    <p class="small sans"><AuthorBadge :author="cur.author" :witness="cur.id" /> · {{ fmtDate(cur.date) }} · {{ cur.edition }}<template v-if="cur.license"> ({{ cur.license }})</template> · <RouterLink :to="witnessTo(cur.id)">картка пам’ятки →</RouterLink> · <a :href="cur.url" target="_blank" rel="noopener">оригінал ↗</a></p>
    <p v-if="locQ" class="small sans muted" role="status">Локатор: {{ locQ }}<template v-if="locIdx < 0 && Array.isArray(toks)"> — у тексті такого локатора немає, показано початок.</template></p>
    <p v-if="cur.licenceNote" class="small sans muted licence-note" role="note">{{ cur.licenceNote }}</p>
    <div v-if="toks === 'loading'" class="skeleton" style="height:8rem" />
    <div v-else-if="!toks" class="card" role="status">
      <p>Тексту цієї пам’ятки ще немає в даних: <code>public/data/texts/{{ cur.id }}.json</code> (<code>{ tokens: [raw, loc, s][] }</code>) створює збірка корпусу. Читач відкриє його без змін у коді.</p>
      <p class="muted small">Тим часом дивіться <RouterLink :to="witnessTo(cur.id)">картку пам’ятки</RouterLink>, приклади вживання зі слів цієї пам’ятки дивіться в картках лем (розділ «Приклади»), а оригінал — за посиланням «відкрити джерело».</p>
    </div>
    <template v-else>
      <nav class="row sans small" aria-label="Сторінки тексту">
        <button type="button" class="chip" :disabled="page <= 0" @click="turn(page - 1)">← назад</button>
        <span>токени {{ page * PAGE_SIZE + 1 }}–{{ Math.min(total, (page + 1) * PAGE_SIZE) }} із {{ fmtNum(total) }}</span>
        <button type="button" class="chip" :disabled="(page + 1) * PAGE_SIZE >= total" @click="turn(page + 1)">далі →</button>
      </nav>
      <p class="reader" style="font-family:var(--serif);line-height:2">
        <template v-for="(t, i) in rows" :key="i">
          <RouterLink v-if="rowRef(t)" :class="['tok', 'attested', { hit: isHit(t.loc), old: isOldForm(t.raw, cur.date[1]) }]" :to="rowRef(t)!" :title="`${t.loc} · ${t.ref}`">{{ t.raw }}</RouterLink>
          <RouterLink v-else-if="t.lemma" :class="['tok', t.status, { derived: t.provenance === 'derived', hit: isHit(t.loc), old: isOldForm(t.raw, cur.date[1]) }]" :to="wordTo(t.lemma)" :title="`${t.loc} · лема «${t.lemma}»`">{{ t.raw }}</RouterLink>
          <RouterLink v-else class="tok unknown" :class="{ hit: isHit(t.loc), old: isOldForm(t.raw, cur.date[1]) }" :to="{ path: '/analyze', query: { q: t.raw } }" :title="t.loc">{{ t.raw }}</RouterLink>{{ t.sep }}
        </template>
      </p>
      <p v-if="rows.length" class="small sans muted">Перше слово сторінки: {{ rows[0]!.loc }}
        <template v-if="locLink(rows[0]!.loc, rows[0]!.raw)"> · <a :href="locLink(rows[0]!.loc, rows[0]!.raw)!.url" target="_blank" rel="noopener">{{ locLink(rows[0]!.loc, rows[0]!.raw)!.label }} ↗</a></template></p>
    </template>
  </template>
</template>
