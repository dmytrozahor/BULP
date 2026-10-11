<script setup lang="ts">
/**
 * Regional panel (research/07 §3.3): relative frequency (ipm) of a lemma by REGION OF THE WITNESS («регіон пам’ятки»), with N tokens per region.
 * Not a dialect claim (SPEC 20 B-3.6) — the text and the table say so. Choropleth = Natural Earth admin-1 (public domain); the same numbers are
 * printed in a table and as tick marks, so colour is never the only signal. Regions without witnesses are hatched and read «немає пам’яток» (unknown ≠ 0).
 * Crimea and Sevastopol are drawn and counted as Ukraine (ISO 3166-2:UA).
 */
import { computed, onMounted, ref } from 'vue'
import type { LemmaCard } from '../../core/types.ts'
import { useData } from '../composables/useData.ts'
import { fmtNum } from '../lib/format.ts'
import { loadGeo, pathOf, regionRows, stepOf, VIEW, type Geo } from '../lib/geo.ts'
const props = defineProps<{ card: LemmaCard }>()
const { corpus } = useData()
const geo = ref<Geo>(), err = ref(''), hot = ref<string | null>(null)
onMounted(() => loadGeo().then(g => (geo.value = g), e => (err.value = String(e.message ?? e))))
const rows = computed(() => regionRows(corpus.value?.regions, props.card.stats.byRegion))
const max = computed(() => Math.max(0, ...rows.value.map(r => r.ipm ?? 0)))
const byOblast = computed(() => { const m = new Map<string, (typeof rows.value)[number]>(); for (const r of rows.value) for (const o of r.oblasts) m.set(o, r); return m })
const shapes = computed(() => (geo.value?.features ?? []).map(f => ({ code: f.properties.code, name: f.properties.name, d: pathOf(f), r: byOblast.value.get(f.properties.code) })))
const step = (r?: (typeof rows.value)[number]) => (r ? stepOf(r.ipm, max.value) : -1)
const describe = (s: { name: string; r?: (typeof rows.value)[number] }) => !s.r || s.r.N === 0 ? `${s.name}: немає пам’яток корпусу (невідомо)` : `${s.name}: регіон пам’ятки «${s.r.name}», ${fmtNum(s.r.ipm ?? 0, 1)} ipm, N = ${fmtNum(s.r.N)}`
</script>

<template>
  <div v-if="!rows.length" class="small muted sans"><span class="unk" tabindex="0" title="немає даних — значення не встановлено (P-3.1)">невідомо</span>: у даних немає розподілу за регіонами пам’яток.</div>
  <div v-else class="regionmap">
    <p class="small muted sans" style="margin-top:0">Регіон пам’ятки — це місце походження свідка (рукопису, видання), а <strong>не діалектна мітка</strong> слова. ipm = f / N · 10⁶ для токенів пам’яток регіону.</p>
    <div class="rm-grid">
      <svg v-if="shapes.length" :viewBox="`0 0 ${VIEW.w} ${VIEW.h}`" role="img" aria-label="Карта регіонів пам’яток: відносна частота" class="rm-svg">
        <defs><pattern id="rm-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--surface-2)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted)" stroke-width="1.2" /></pattern></defs>
        <path v-for="s in shapes" :key="s.code" :d="s.d" :class="['rm-o', 'rm-s' + step(s.r)]" :fill="step(s.r) < 0 ? 'url(#rm-hatch)' : undefined" tabindex="0"
          :aria-label="describe(s)" @mouseenter="hot = describe(s)" @focus="hot = describe(s)" @mouseleave="hot = null" @blur="hot = null"><title>{{ describe(s) }}</title></path>
      </svg>
      <p v-else-if="err" class="unk small" role="alert">карту не завантажено: {{ err }}</p>
      <p v-else class="muted small" role="status">завантаження карти…</p>
      <div>
        <table class="small sans"><caption class="muted" style="text-align:left">Регіони пам’яток</caption>
          <thead><tr><th>регіон пам’ятки</th><th class="num">f</th><th class="num">N</th><th class="num">ipm</th></tr></thead>
          <tbody><tr v-for="r in rows" :key="r.code"><td>{{ r.name }}<div class="muted">{{ r.oblasts.join(', ') }}</div></td><td class="num">{{ r.f }}</td><td class="num">{{ fmtNum(r.N) }}</td>
            <td class="num"><template v-if="r.ipm === undefined"><span class="unk">немає пам’яток</span></template><template v-else>{{ fmtNum(r.ipm, 1) }} <span aria-hidden="true">{{ '▮'.repeat(Math.max(0, stepOf(r.ipm, max))) || '·' }}</span></template></td></tr></tbody></table>
        <p class="small muted sans" aria-live="polite" style="min-height:1.4em">{{ hot }}</p>
      </div>
    </div>
    <p class="small muted sans" style="margin-bottom:0">Штрихування — у корпусі немає пам’яток цього регіону (невідомо, не нуль). Крим і Севастополь показано як частину України (ISO 3166-2:UA). Межі: Natural Earth (public domain), спрощено.</p>
  </div>
</template>
