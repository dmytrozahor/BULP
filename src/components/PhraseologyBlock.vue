<script setup lang="ts">
/**
 * SPEC 63 GG-13 «Фразеологія» (Вікісловник): the set expressions, phraseological units and proverbs that uk.wiktionary lists on the headword's page, and the multi-word phrase / proverb
 * headwords of en.wiktionary (kaikki) that contain the word. Each row: the unit, its variants and gloss as the page gives them, and the edition. This is the Wiktionary's own list: it is NOT the
 * attested/candidate phraseme panel of the corpus. Lazy: loaded only when a card renders it, with the lm/phr shard. `rows` replaces the fetch (tests).
 */
import { computed } from 'vue'
import { CHECKED_PHR, ED_NAME, IA_TITLE, LICENCE, wiktUrl, type Edition, type PhrRow } from '../../core/synphr.ts'
import type { PlaceNote } from '../../core/proverbs.ts'
import { phrOf } from '../lib/synData.ts'
const props = defineProps<{ word: string; rows?: PhrRow[]; kind?: string }>()
const list = computed(() => props.rows ?? phrOf(props.word))
const TITLE: Record<string, string> = { f: 'Усталені словосполучення й фразеологізми (розділ сторінки uk.Вікісловника)', p: 'Прислів’я та приказки (uk.Вікісловник)', w: 'Фраза чи прислів’я — власний заголовок en.Вікісловника', wx: 'Фрази en.Вікісловника, що містять це слово' }
const LIMIT = 12, PLIMIT = 6
const isPrinted = (x: PhrRow) => x.d === 'n' || x.d === 'f'
/** GG-19: rows of the printed collections (Номис 1864, Франко): proverbs of the print with the locator; the place of recording only where the print's register resolves it */
const printed = computed(() => (list.value ?? []).filter(isPrinted))
const placeText = (pl?: PlaceNote[]): string => (pl ?? []).filter(x => x.gr === 'p').map(x => `${x.n}${x.c ? ` (${x.c} пов.)` : ''}`).join('; ')
const printedSrc = computed(() => [...new Set(printed.value.map(x => x.s!))])
const groups = computed(() => {
  const out: { id: string; items: PhrRow[] }[] = []
  for (const id of ['f', 'p', 'w', 'wx']) {
    const items = (list.value ?? []).filter(x => !isPrinted(x) && (x.x ? 'wx' : x.k) === id)
    if (items.length) out.push({ id, items })
  }
  return out
})
const editions = computed(() => [...new Set((list.value ?? []).filter(x => !x.x && !isPrinted(x)).map(x => x.d))] as Edition[])
</script>

<template>
  <div class="phrw sans small" :data-testid="`phrw-${kind ?? 'card'}`">
    <p v-if="list === undefined" class="muted" data-testid="phrw-loading">фразеологія: завантаження…</p>
    <p v-else-if="!list.length" class="muted" data-testid="phrw-none">немає даних (перевірено: {{ CHECKED_PHR }}; «{{ word }}» там не має таких записів)</p>
    <template v-else>
      <div v-for="g in groups" :key="g.id" class="phrw-grp" :data-testid="`phrw-${g.id}`">
        <strong>{{ TITLE[g.id] }}</strong> <span class="muted">({{ g.items.length }})</span>
        <ul class="phrw-list">
          <li v-for="x in g.items.slice(0, LIMIT)" :key="x.p + x.k">
            <span class="phrw-p">{{ x.p }}</span><span v-if="x.v?.length" class="muted"> ({{ x.v.join(', ') }})</span><span v-if="x.g" class="muted"> — {{ x.g }}</span> <span class="badge" :title="ED_NAME[x.d]">{{ x.d === 'u' ? 'uk' : 'en' }}</span>
          </li>
        </ul>
        <details v-if="g.items.length > LIMIT"><summary>ще {{ g.items.length - LIMIT }}</summary>
          <ul class="phrw-list"><li v-for="x in g.items.slice(LIMIT)" :key="x.p + x.k"><span class="phrw-p">{{ x.p }}</span><span v-if="x.v?.length" class="muted"> ({{ x.v.join(', ') }})</span><span v-if="x.g" class="muted"> — {{ x.g }}</span> <span class="badge" :title="ED_NAME[x.d]">{{ x.d === 'u' ? 'uk' : 'en' }}</span></li></ul>
        </details>
      </div>
      <div v-if="printed.length" class="phrw-grp" data-testid="phrw-print">
        <strong>Прислів’я та приказки друкованих збірок: Номис (1864), Франко (1901–1910)</strong> <span class="muted">({{ printed.length }})</span>
        <ul class="phrw-list">
          <li v-for="x in printed.slice(0, PLIMIT)" :key="x.p + x.l" :data-testid="`phrw-pr-${x.d}`">
            <span class="phrw-p">{{ x.p }}</span><span v-if="x.m" class="muted"> (сучасним правописом: {{ x.m }})</span><span v-if="x.v?.length" class="muted"> ({{ x.v.join(' — ') }})</span>
            <span class="badge" :title="ED_NAME[x.d]">{{ x.d === 'n' ? 'Ном.' : 'Фр.' }}</span>
            <span class="muted small"> {{ x.l }}<template v-if="placeText(x.pl)">; записано: {{ placeText(x.pl) }}</template></span>
          </li>
        </ul>
        <details v-if="printed.length > PLIMIT"><summary>ще {{ printed.length - PLIMIT }}</summary>
          <ul class="phrw-list"><li v-for="x in printed.slice(PLIMIT)" :key="x.p + x.l"><span class="phrw-p">{{ x.p }}</span><span v-if="x.m" class="muted"> (сучасним правописом: {{ x.m }})</span><span v-if="x.v?.length" class="muted"> ({{ x.v.join(' — ') }})</span> <span class="badge" :title="ED_NAME[x.d]">{{ x.d === 'n' ? 'Ном.' : 'Фр.' }}</span><span class="muted small"> {{ x.l }}<template v-if="placeText(x.pl)">; записано: {{ placeText(x.pl) }}</template></span></li></ul>
        </details>
        <p class="muted small" data-testid="phrw-print-src">Джерело (громадське надбання; текст — розпізнаний OCR archive.org, не вичитаний, тож написання можуть мати помилки розпізнавання):
          <template v-for="(id, i) in printedSrc" :key="id"><a v-if="!id.startsWith('nplu-')" :href="`https://archive.org/details/${id}`" rel="noopener" target="_blank">{{ IA_TITLE[id] ?? id }} ↗</a><span v-else>{{ IA_TITLE[id] ?? id }}</span><template v-if="i < printedSrc.length - 1">; </template></template>.
          Місце запису подано лише там, де його розв’язує реєстр скорочень самого видання; діалектної групи ми з нього не виводимо.</p>
      </div>
      <p v-if="editions.length" class="muted phrw-src" data-testid="phrw-src">Джерело:
        <template v-for="(d, i) in editions" :key="d"><a :href="wiktUrl(d, word)" rel="noopener" target="_blank">{{ ED_NAME[d] }} ↗</a><template v-if="i < editions.length - 1">; </template></template>
        — {{ LICENCE }}, автори сторінок на Вікісловнику. Це перелік Вікісловника: його записи не є ні «засвідченими» нашим корпусом, ні нашими кандидатами, а сторінка може подавати просто словосполучення, а не ідіому.</p>
    </template>
  </div>
</template>
