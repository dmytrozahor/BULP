<script setup lang="ts">
/**
 * SPEC 63 LB-5 «Мітки» — the same block on every card kind (CP-1 block `labels`). Owner 2026-10-22: «всюди має бути зазначено діалект і тип і регістр і значення і сенси …
 * мають бути дані». Four rows, each = value + method («як визначено» tooltip) + evidence (the details under it), or an explicit «немає даних (перевірено: …)»:
 *  Діалект  one of four classes (core/labels.ts): діалектне за словником / регіонально марковане (корпус) / загальновживане / недостатньо даних
 *  Регістр  per lemma and per sense, from the dictionaries; none → «нейтральне (немає позначок у словниках)» + the dictionaries checked
 *  Тип      part of speech + morphological class + word type
 *  Значення link to «Значення за епохами» (SE); the sense-level labels stand beside it
 * The data comes from lm/lb (pipelines/build-labels.ts); `byRegion` (full card) lets the class be computed in the browser when the shard has no entry.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useLabels } from '../lib/labelsData.ts'
import { useData } from '../composables/useData.ts'
import { openPanel } from '../lib/cardTabs.ts'
import {
  baseEvidence, dialectHeadline, dialectHow, gradeLine, formTagsLine, hitView, METHODS_PATH, METHODS_TITLE, NEUTRAL, neutralChecked, regTitle, regViews, SURZHYK_NOTE, THRESHOLDS_LINE, typeBase, typeViews,
} from '../lib/labelsText.ts'
import { classUk } from '../../core/labels.ts'
import type { LemmaCard } from '../../core/types.ts'
const props = defineProps<{ lemma: string; /** card kind, for test ids and the SE panel */ kind?: 'full' | 'light' | 'dict' | 'orv' | 'arch' | 'mu' | 'form'; byRegion?: LemmaCard['stats']['byRegion'] }>()
const { entry, loading } = useLabels(() => props.lemma, () => props.byRegion)
const { corpus } = useData()
const regionName = (code: string) => corpus.value?.regions?.find(r => r.code === code)?.name ?? code
const d = computed(() => entry.value.d)
const headline = computed(() => dialectHeadline(d.value, regionName))
const how = computed(() => dialectHow(d.value))
const grade = computed(() => gradeLine(d.value))
const bases = computed(() => baseEvidence(d.value))
const hits = computed(() => (d.value.dict ?? []).map(hitView))
const regs = computed(() => regViews(entry.value.r))
const types = computed(() => typeViews(entry.value.t))
const senseLabels = computed(() => entry.value.s ?? [])
const rows = computed(() => d.value.corp?.rows ?? [])
const sePanel = computed(() => `se-${props.kind === 'form' ? 'full' : props.kind ?? 'full'}`)
const plainLine = (p: [string, string]) => (p[0] === 'w' ? `uk.Вікісловник (${p[1]})` : p[0] === 'k' ? `en.Вікісловник (${p[1].split('\t')[0]})` : `СУМ (${p[1].split('\t').join(': ')})`)
</script>

<template>
  <div class="lb sans" :data-testid="`labels-${kind ?? 'card'}`" :data-class="d.c">
    <p v-if="loading && !byRegion" class="small muted" role="status">завантаження міток…</p>
    <dl class="lb-dl">
      <dt class="muted">Діалект</dt>
      <dd :data-testid="`lb-dialect-${kind ?? 'card'}`">
        <span :class="['badge', d.c === 'dict' ? 'dialect' : '']" tabindex="0" :title="how" data-testid="lb-class">{{ classUk(d) }}</span>
        <span class="badge" tabindex="0" :title="grade" data-testid="lb-grade">{{ grade }}</span>
        <span class="small"> — {{ headline }}</span>
        <button type="button" class="chip small lb-how" :title="how" :aria-label="`як визначено: ${how}`">як визначено</button>
        <template v-if="d.c === 'dict' && hits.length">
          <ul class="small lb-ev">
            <li v-for="(h, i) in hits.slice(0, 6)" :key="i">
              <strong>{{ h.dict }}</strong>: мітка «{{ h.abbr }}»<template v-if="h.meaning"> — <em>{{ h.meaning }}</em> ({{ h.list }})</template>;
              <span v-if="h.place" class="muted">позначає місце запису, не діалектність слова; </span><template v-if="h.area">область: {{ h.area }}<template v-if="h.group">, група: {{ h.group }}</template>; </template>
              <template v-if="h.word">слово «{{ h.word }}»; </template>
              <q class="lb-q">{{ h.quote }}</q> <a v-if="h.url.startsWith('http')" :href="h.url" rel="noopener" target="_blank">стаття ↗</a>
              <span v-if="h.variant" class="muted"> · скорочення не надруковане у списку: розкрите за правилом списку «X. у. = X-ський повіт»</span>
              <details v-if="h.gov" class="small muted"><summary>повіт → губернія (uk.wikipedia, CC BY-SA)</summary>{{ h.gov }}</details>
            </li>
          </ul>
          <p v-if="hits.length > 6" class="small muted">і ще {{ hits.length - 6 }} позначок</p>
        </template>
        <p v-if="d.sumNorm?.length" class="small muted" data-testid="lb-sumnorm">Підстава: {{ d.sumNorm.map(x => `${x.d === 'sum11' ? 'СУМ-11' : x.d === 'sum20' ? 'СУМ-20' : x.d}${x.l ? ' ' + x.l : ''}, значень: ${x.n}`).join('; ') }}; жодне значення не має позначки діал., зах. чи регістрової. <template v-for="x in d.sumNorm" :key="x.d"><a v-if="x.u" :href="x.u" rel="noopener" target="_blank">стаття {{ x.d }} ↗ </a></template></p>
        <ul v-if="bases.length" class="small lb-ev" data-testid="lb-base"><li v-for="b in bases" :key="b.short"><strong>{{ b.short }}</strong>: основа — {{ b.region }}; <q class="lb-q">{{ b.quote }}</q> <a :href="b.url" rel="noopener" target="_blank">передмова ↗</a></li></ul>
        <p v-if="d.c === 'witness' && d.wit" class="small muted" data-testid="lb-wit">Регіон пам’ятки — місце видання чи авторства джерела, а не діалектна мітка слова; цей доказ слабкий.</p>
        <p v-if="d.c === 'few'" class="small muted" data-testid="lb-why">Причина: {{ d.why ?? d.need }}.</p>
        <p v-if="d.plain?.length" class="small muted">«діал.» без назви області: {{ d.plain.map(plainLine).join('; ') }}</p>
        <details v-if="d.corp" class="small lb-corp" :open="d.c === 'corpus'">
          <summary>регіони пам’яток: {{ d.corp.f }} уживань, {{ d.corp.att }} з {{ d.corp.nReg }} регіонів, DP {{ d.corp.dp.toFixed(2) }}</summary>
          <table class="small lb-tbl"><thead><tr><th>регіон</th><th>f</th><th>N (слів)</th><th>ipm</th></tr></thead>
            <tbody><tr v-for="r in rows" :key="r.code" :class="{ top: d.corp.top?.code === r.code }"><td>{{ regionName(r.code) }}</td><td>{{ r.f }}</td><td>{{ r.N }}</td><td>{{ ((1e6 * r.f) / r.N).toFixed(1) }}</td></tr></tbody></table>
          <p class="muted">Регіон пам’ятки — місце видання/авторства джерела, а не діалектна мітка (FD-2). Пороги: {{ THRESHOLDS_LINE }}.</p>
        </details>
        <p v-else-if="d.c !== 'dict'" class="small muted">корпус не містить засвідчень цієї леми (перевірено: таблиця регіонів пам’яток).</p>
      </dd>

      <dt class="muted">Регістр</dt>
      <dd :data-testid="`lb-register-${kind ?? 'card'}`">
        <template v-if="regs.length">
          <span v-for="v in regs" :key="v.id" class="badge" tabindex="0" :title="regTitle(v)">{{ v.abbr }} <small class="muted">{{ v.full }}</small></span>
          <ul class="small lb-ev">
            <li v-for="v in regs" :key="v.id"><strong>{{ v.abbr }}</strong>: <template v-for="(s, i) in v.sources" :key="i"><template v-if="i">; </template>{{ s.srcUk }}<template v-if="s.sense"> (значення {{ s.sense }})</template> — <span class="muted">{{ s.detail }}</span> <a v-if="s.url?.startsWith('http')" :href="s.url" rel="noopener" target="_blank">стаття ↗</a></template></li>
          </ul>
        </template>
        <template v-else>
          <span class="badge" tabindex="0" title="Позначок вжитку не знайдено в жодному з перелічених джерел; це не доведення «літературності» — лише відсутність позначок.">{{ NEUTRAL }}</span>
          <details class="small muted"><summary>перевірено</summary><ul><li v-for="c in neutralChecked()" :key="c">{{ c }}</li></ul></details>
        </template>
        <p v-if="entry.f?.length" class="small muted">ВЕСУМ позначає окремі форми (не лему): {{ formTagsLine(entry) }}</p>
        <p class="small muted">{{ SURZHYK_NOTE }}</p>
      </dd>

      <dt class="muted">Тип</dt>
      <dd :data-testid="`lb-type-${kind ?? 'card'}`">
        <span>{{ typeBase(entry) }}</span>
        <template v-if="types.length"><span v-for="(t, i) in types" :key="i" class="badge" tabindex="0" :title="`${t.srcUk}: ${t.detail}`">{{ t.uk }}</span>
          <ul class="small lb-ev"><li v-for="(t, i) in types" :key="i"><strong>{{ t.uk }}</strong>: {{ t.srcUk }} — <span class="muted">{{ t.detail }}</span> <a v-if="t.url?.startsWith('http')" :href="t.url" rel="noopener" target="_blank">стаття ↗</a></li></ul></template>
        <span v-else class="small muted"> · словесного типу (власна назва, абревіатура, запозичення, церковнослов’янізм, архаїзм) у джерелах немає (перевірено: ВЕСУМ, словники r2u, аналіз запозичень, картка)</span>
      </dd>

      <dt class="muted">Значення</dt>
      <dd :data-testid="`lb-senses-${kind ?? 'card'}`">
        <button type="button" class="chip small" @click="openPanel(sePanel)">«Значення за епохами» →</button>
        <template v-if="senseLabels.length"><ul class="small lb-ev"><li v-for="(s, i) in senseLabels" :key="i">значення {{ s[0] ?? '·' }} ({{ s[1] }}): {{ s[2].join(', ') }}</li></ul></template>
        <span v-else class="small muted"> · позначок на окремих значеннях немає (перевірено: рядки значень словників у «Значення за епохами»)</span>
      </dd>
    </dl>
    <p class="small"><RouterLink :to="METHODS_PATH" data-testid="lb-methods-link">{{ METHODS_TITLE }} →</RouterLink></p>
  </div>
</template>

<style scoped>
.lb-dl { display: grid; grid-template-columns: 6rem 1fr; gap: .45rem .8rem; margin: 0; }
.lb-dl dt, .lb-dl dd { margin: 0; }
.lb-ev { margin: .2rem 0 .2rem 1rem; padding: 0; }
.lb-q { font-family: var(--form); }
.lb-how { margin-left: .4rem; }
.lb-tbl { border-collapse: collapse; } .lb-tbl th, .lb-tbl td { padding: .1rem .5rem; text-align: right; } .lb-tbl th:first-child, .lb-tbl td:first-child { text-align: left; }
.lb-tbl tr.top { font-weight: 600; }
@media (max-width: 40rem) { .lb-dl { grid-template-columns: 1fr; } }
</style>
