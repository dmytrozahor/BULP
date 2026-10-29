<script setup lang="ts">
/**
 * SPEC 63 GG-12 «Синоніми й антоніми»: the relations that uk.wiktionary and en.wiktionary (kaikki) print for this headword, each with its source edition + page, the sense it is attached to
 * (uk: the numbered item and its gloss; en: the sense gloss) and the qualifiers the page prints. A target that is neither a VESUM lemma nor a card of ours is shown unlinked.
 * Nothing is inferred or mirrored. Lazy: loaded only when a card renders it (OverviewTab), together with the lm/syn shard, so the first load of a card does not grow. `rows` replaces the fetch (tests).
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CHECKED_SYN, ED_NAME, LICENCE, REL_NAME, REL_ORDER, wiktUrl, type Edition, type SynRow } from '../../core/synphr.ts'
import { synOf } from '../lib/synData.ts'
import { wordTo } from '../lib/nav.ts'
const props = defineProps<{ word: string; rows?: SynRow[]; kind?: string }>()
const list = computed(() => props.rows ?? synOf(props.word))
interface Group { label: string; ed: Edition; items: SynRow[] }
/** per relation, rows grouped by (edition, sense): the page's own sense order */
const sections = computed(() => {
  const out: { r: (typeof REL_ORDER)[number]; groups: Group[] }[] = []
  for (const r of REL_ORDER) {
    const rows = (list.value ?? []).filter(x => x.r === r); if (!rows.length) continue
    const groups: Group[] = []
    for (const x of rows) {
      const label = x.g ?? (x.n ? `значення ${x.n}` : ''), g = groups.find(y => y.ed === x.d && y.label === label)
      if (g) g.items.push(x); else groups.push({ label, ed: x.d, items: [x] })
    }
    out.push({ r, groups })
  }
  return out
})
const editions = computed(() => [...new Set((list.value ?? []).map(x => x.d))] as Edition[])
const tagText = (q: string[] | undefined) => (q ?? []).join(', ')
</script>

<template>
  <div class="synant sans small" :data-testid="`synant-${kind ?? 'card'}`">
    <p v-if="list === undefined" class="muted" data-testid="synant-loading">синоніми й антоніми: завантаження…</p>
    <p v-else-if="!list.length" class="muted" data-testid="synant-none">немає даних (перевірено: {{ CHECKED_SYN }}; «{{ word }}» там не має зв’язків цього типу)</p>
    <template v-else>
      <div v-for="s in sections" :key="s.r" class="synant-rel" :data-testid="`synant-rel-${s.r}`">
        <strong>{{ REL_NAME[s.r] }}</strong>
        <p v-for="g in s.groups" :key="g.ed + g.label" class="synant-grp">
          <span v-if="g.label" class="muted" :title="g.ed === 'u' ? 'значення зі сторінки uk.Вікісловника' : 'значення зі сторінки en.Вікісловника'">({{ g.label }}) </span>
          <template v-for="(x, i) in g.items" :key="x.t">
            <RouterLink v-if="!x.u" :to="wordTo(x.t)" class="synant-t" data-testid="synant-linked">{{ x.t }}</RouterLink>
            <span v-else class="synant-t synant-u" data-testid="synant-unlinked" title="немає леми ВЕСУМ чи картки з таким написанням">{{ x.t }}</span>
            <span v-if="x.q?.length" class="muted"> ({{ tagText(x.q) }})</span><span class="badge" :title="ED_NAME[x.d]">{{ x.d === 'u' ? 'uk' : 'en' }}</span><template v-if="i < g.items.length - 1">, </template>
          </template>
        </p>
      </div>
      <p class="muted synant-src" data-testid="synant-src">Джерело:
        <template v-for="(d, i) in editions" :key="d"><a :href="wiktUrl(d, word)" rel="noopener" target="_blank">{{ ED_NAME[d] }}, сторінка «{{ word }}» ↗</a><template v-if="i < editions.length - 1">; </template></template>
        — {{ LICENCE }}, автори сторінок на Вікісловнику. Зв’язок показано так, як його подає сторінка; ми його не виводимо й не віддзеркалюємо. Без посилання — слово, якого немає серед лем ВЕСУМ чи наших карток.</p>
    </template>
  </div>
</template>
