<script setup lang="ts">
/**
 * SPEC 63 CR-1 «Відповідники» (presentation; CorrBlock loads the shard and passes the groups): the correspondence groups of a lemma (core/corr.ts) — ONE compact line per group (a chip per OTHER member, at most 5, the rest behind «ще N»; a chip opens that word's card) and, under it,
 * a Collapsible «Відповідники · N» with the table Форма | Тип | Говір (grade visible) | Перша фіксація | Вживань | Джерело. The same stored group is printed on every member's card, the card's own word highlighted
 * (mutual by construction). Replaces the old «Родина варіантів» line: the variant families are one source of the groups (core/variant-families.ts → core/corr-src.ts familyPairs).
 * Honest grades: an area from a dictionary is named, a corpus distribution is printed as «у корпусі переважно: …» with its minimum, an owner's statement is «за свідченням носія»; no evidence = «говір не встановлено».
 * The chosen «Говір» only reorders and marks the members of that dialect; the word in the card header is not changed. Nothing is shown for a word without a group. Lazy: the shard is read when this mounts.
 */
import { computed } from 'vue'
import { CORPUS_RULE, GRADE_UK, UNSPEC, groupsForCard, otherCount, tableRows, topLine, type CorrGroup } from '../../core/corr.ts'
import Collapsible from './Collapsible.vue'
import EvidencePopover from './EvidencePopover.vue'
const props = defineProps<{ lemma: string; /** the groups the lemma is in (already loaded) */ groups: CorrGroup[]; /** dialect code of the «Говір» switch ('' = нормативна) */ dialect?: string }>()
const groups = computed<CorrGroup[]>(() => groupsForCard(props.groups, props.lemma))
const n = computed(() => otherCount(groups.value, props.lemma))
const wl = (l: string) => '/w/' + encodeURIComponent(l)
const lines = computed(() => groups.value.filter(g => !g.members.every(m => m.unspec)).map(g => ({ g, top: topLine(g, props.lemma, (props.dialect ?? '')), rows: tableRows(g, props.lemma, (props.dialect ?? '')) })))
/** the pairs whose sense is not determined, ONE table for all of them (a word with many one-sided synonyms must not print a table per pair) */
const loose = computed(() => { const seen = new Set<string>(), rows = groups.value.filter(g => g.members.every(m => m.unspec)).flatMap(g => tableRows(g, props.lemma, (props.dialect ?? '')).filter(r => !r.self)); return rows.filter(r => !seen.has(r.form) && !!seen.add(r.form)) })
const tables = computed(() => [...lines.value.map(l => ({ key: l.g.id, title: l.g.meaning, rows: l.rows, unspec: false })), ...(loose.value.length ? [{ key: 'loose', title: 'інші відповідники', rows: loose.value, unspec: true }] : [])])
</script>

<template>
  <div v-if="groups.length" class="corr hl-line sans small" data-testid="corr">
    <p v-for="l in lines.filter(x => x.top)" :key="l.g.id" class="corr-line" data-testid="corr-line">
      <span class="muted">У говорах і варіантах<template v-if="groups.length > 1"> ({{ l.g.meaning }})</template>: </span>
      <template v-for="(c, i) in l.top!.chips" :key="c.form"><span v-if="i" class="muted"> · </span>
        <RouterLink :to="wl(c.form)" :class="['chip', { 'corr-hit': c.dialectHit }]" data-testid="corr-chip">{{ c.form }}</RouterLink><span v-if="c.area || c.year" class="muted"> ({{ [c.area, c.year].filter(Boolean).join(', ') }})</span><span v-if="c.dialectHit" class="badge" title="збігається з обраним говором">ваш говір</span></template>
      <span v-if="l.top!.more" class="muted"> · ще {{ l.top!.more }}</span>
    </p>
    <Collapsible id="corr" title="Відповідники" :count="n" testid="corr-table">
      <template v-for="t in tables" :key="t.key">
        <h4 v-if="tables.length > 1 || t.unspec" class="small sans">{{ t.title }}<span v-if="t.unspec" class="muted"> · {{ UNSPEC }}</span></h4>
        <table class="corr-table small sans" data-testid="corr-rows">
          <thead><tr><th>Форма</th><th>Тип</th><th>Говір</th><th>Перша фіксація</th><th>Вживань</th><th>Джерело</th></tr></thead>
          <tbody>
            <tr v-for="r in t.rows" :key="r.form" :class="{ self: r.self, hit: r.dialectHit }" :data-self="r.self ? '1' : undefined">
              <td><strong v-if="r.self">{{ r.form }}</strong><RouterLink v-else :to="wl(r.form)">{{ r.form }}</RouterLink><span v-if="r.unspec" class="muted"> · {{ UNSPEC }}</span></td>
              <td>{{ r.type }}</td>
              <td>{{ r.area }}<span v-if="r.grade" class="muted"> [{{ GRADE_UK[r.grade] }}]</span><span v-if="r.dialectHit" class="badge" title="збігається з обраним говором">ваш говір</span></td>
              <td><RouterLink v-if="r.firstHref" :to="r.firstHref">{{ r.first }}</RouterLink><template v-else>{{ r.first }}</template></td>
              <td>{{ r.freq ?? '—' }}</td>
              <td>{{ r.source }} <EvidencePopover :evidence="r.evidence" heading="Джерело відповідника" /></td>
            </tr>
          </tbody>
        </table>
      </template>
      <p class="muted small">Перша фіксація — найраніша в нашому корпусі, а не в мові; словникову дату подано окремо; OCR без вичитки не береться. Розподіл у корпусі — {{ CORPUS_RULE }}.</p>
    </Collapsible>
  </div>
</template>

<style scoped>
.corr-table { border-collapse: collapse; width: 100%; margin: .3rem 0 }
.corr-table th, .corr-table td { text-align: left; padding: .15rem .5rem .15rem 0; vertical-align: top }
.corr-table tr.self td { background: color-mix(in srgb, var(--accent, #36c) 10%, transparent) }
.corr-hit { font-weight: 600 }
</style>
