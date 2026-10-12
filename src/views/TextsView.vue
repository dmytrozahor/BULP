<script setup lang="ts">
/**
 * /texts[?w=<witness>[&p=<page>]] — U-8 corpus reader: all witnesses of corpus.json (filter by epoch / author / region), and a witness's running text
 * annotated with the existing annotate() pipeline, PAGE_SIZE tokens at a time (paged, so a long chronicle never renders at once).
 * Data contract: running text lives in public/data/texts/<witness>.json = { tokens: [raw, loc, s][] } (s = the separator that follows the token, '' or ' ' / true|false),
 * produced later by the backend. Until that file exists the reader shows the witness's own KWIC examples (from the detail shards of its lemmas is not loaded here;
 * the fixture/real core has none per witness) and says so — it never invents text.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isKnown } from '../../core/evidence.ts'
import { annotate } from '../lib/annotate.ts'
import { epochShort, fmtDate, fmtNum, LANG_UK } from '../lib/format.ts'
import { sourceLink } from '../lib/source.ts'
import { authorInfo, useData } from '../composables/useData.ts'
import AuthorBadge from '../components/AuthorBadge.vue'
const PAGE_SIZE = 200
const route = useRoute(), router = useRouter()
const { corpus, loaded, annData, witnessById } = useData()
const ep = ref(''), au = ref(''), rg = ref('')
const epochOf = (w: NonNullable<typeof corpus.value>['witnesses'][number]) => (isKnown(w.epochShev) ? w.epochShev.value.epochs[0]! : 'unknown')
const all = computed(() => corpus.value?.witnesses ?? [])
const epochs = computed(() => [...new Set(all.value.map(epochOf))])
const authors = computed(() => [...new Set(all.value.map(w => w.author))].map(a => ({ id: a, name: authorInfo(a).name })))
const regions = computed(() => [...new Set(all.value.map(w => w.region).filter(Boolean) as string[])])
const list = computed(() => all.value.filter(w => (!ep.value || epochOf(w) === ep.value) && (!au.value || w.author === au.value) && (!rg.value || w.region === rg.value)))
const cur = computed(() => witnessById.value.get(String(route.query.w ?? '')))
const page = computed(() => Math.max(0, (+String(route.query.p ?? '0') || 0)))
const open = (id: string) => router.push({ path: '/texts', query: { w: id } })
const turn = (p: number) => router.push({ path: '/texts', query: { w: cur.value!.id, p: String(p) } })

const toks = ref<[string, string, string | boolean][] | null | 'loading'>(null)
watch(() => cur.value?.id, async id => {
  toks.value = null; if (!id) return
  toks.value = 'loading'
  try {
    const r = await fetch(`./data/texts/${encodeURIComponent(id)}.json`)
    if (!r.ok) throw new Error(String(r.status))
    const j = await r.json(); toks.value = Array.isArray(j?.tokens) ? j.tokens : null
  } catch { toks.value = null }
}, { immediate: true })
const total = computed(() => (Array.isArray(toks.value) ? toks.value.length : 0))
const rows = computed(() => {
  if (!Array.isArray(toks.value) || !loaded.value) return []
  return toks.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE).map(([raw, loc, s]) => {
    const a = annotate(raw, annData.value)[0]
    return { raw, loc, sep: typeof s === 'string' ? s : s === false ? '' : ' ', lemma: a?.lemma, status: a?.status ?? 'unknown', provenance: a?.provenance }
  })
})
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
      <li v-for="w in list" :key="w.id" class="card" style="margin:.5rem 0">
        <button type="button" class="chip" @click="open(w.id)"><strong>{{ w.title }}</strong></button>
        <div class="small sans"><AuthorBadge :author="w.author" :witness="w.id" /> · {{ fmtDate(w.date) }} · {{ epochShort(epochOf(w)) }}<template v-if="w.region"> · {{ w.region }}</template> · {{ LANG_UK[w.lang] }} · {{ fmtNum(w.n) }} слів
          · <a :href="w.url" target="_blank" rel="noopener">відкрити джерело ↗</a></div>
        <div v-if="w.licenceNote" class="small sans muted" role="note">{{ w.licenceNote }}</div>
      </li>
    </ul>
  </template>
  <template v-else>
    <p><RouterLink to="/texts">← усі пам’ятки</RouterLink></p>
    <h2>{{ cur.title }}</h2>
    <p class="small sans"><AuthorBadge :author="cur.author" :witness="cur.id" /> · {{ fmtDate(cur.date) }} · {{ cur.edition }}<template v-if="cur.license"> ({{ cur.license }})</template> · <a :href="cur.url" target="_blank" rel="noopener">відкрити джерело ↗</a></p>
    <p v-if="cur.licenceNote" class="small sans muted licence-note" role="note">{{ cur.licenceNote }}</p>
    <div v-if="toks === 'loading'" class="skeleton" style="height:8rem" />
    <div v-else-if="!toks" class="card" role="status">
      <p>Тексту цієї пам’ятки ще немає в даних: <code>public/data/texts/{{ cur.id }}.json</code> (<code>{ tokens: [raw, loc, s][] }</code>) створює збірка корпусу. Читач відкриє його без змін у коді.</p>
      <p class="muted small">Тим часом приклади вживання зі слів цієї пам’ятки дивіться в картках лем (розділ «Приклади»), а оригінал — за посиланням «відкрити джерело».</p>
    </div>
    <template v-else>
      <nav class="row sans small" aria-label="Сторінки тексту">
        <button type="button" class="chip" :disabled="page <= 0" @click="turn(page - 1)">← назад</button>
        <span>токени {{ page * PAGE_SIZE + 1 }}–{{ Math.min(total, (page + 1) * PAGE_SIZE) }} із {{ fmtNum(total) }}</span>
        <button type="button" class="chip" :disabled="(page + 1) * PAGE_SIZE >= total" @click="turn(page + 1)">далі →</button>
      </nav>
      <p class="reader" style="font-family:var(--serif);line-height:2">
        <template v-for="(t, i) in rows" :key="i">
          <RouterLink v-if="t.lemma" :class="['tok', t.status, { derived: t.provenance === 'derived' }]" :to="`/w/${encodeURIComponent(t.lemma)}`" :title="`${t.loc} · лема «${t.lemma}»`">{{ t.raw }}</RouterLink>
          <span v-else class="tok unknown" :title="t.loc">{{ t.raw }}</span>{{ t.sep }}
        </template>
      </p>
      <p v-if="rows.length" class="small sans muted">Перше слово сторінки: {{ rows[0]!.loc }}
        <template v-if="locLink(rows[0]!.loc, rows[0]!.raw)"> · <a :href="locLink(rows[0]!.loc, rows[0]!.raw)!.url" target="_blank" rel="noopener">{{ locLink(rows[0]!.loc, rows[0]!.raw)!.label }} ↗</a></template></p>
    </template>
  </template>
</template>
