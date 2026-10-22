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
import { FULL, loadGeo, loadHistorical, panBy, pathOf, regionRows, stepOf, VIEW, zoomAt, zoomOf, type Geo, type HistGeo, type ViewBox } from '../lib/geo.ts'
import { TERRITORIES, TERRITORIES_NOT_DRAWN, territoryGaz, territoryGroupEvidence } from '../../core/territories.ts'
const props = defineProps<{ card?: LemmaCard; by?: LemmaCard['stats']['byRegion']; /** SPEC 63 OV-11: small map for the «Огляд» tab */ compact?: boolean }>()
const { corpus } = useData()
const geo = ref<Geo>(), hgeo = ref<HistGeo>(), err = ref(''), hot = ref<string | null>(null)
onMounted(() => { loadGeo().then(g => (geo.value = g), e => (err.value = String(e.message ?? e))); loadHistorical().then(g => (hgeo.value = g), () => { /* historical layer is optional: the modern map stays */ }) })

// MP-3: pan / zoom (buttons, drag, ctrl+wheel, pinch, keys) — the frame is clamped; at zoom 1 the page still scrolls vertically over the map.
const vb = ref<ViewBox>({ ...FULL }), svgEl = ref<SVGSVGElement>()
const viewBox = computed(() => `${vb.value.x.toFixed(1)} ${vb.value.y.toFixed(1)} ${vb.value.w.toFixed(1)} ${vb.value.h.toFixed(1)}`)
const zoomed = computed(() => zoomOf(vb.value) > 1.01)
const pts = new Map<number, { x: number; y: number }>()
let pinch = 0
const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a!.x - b!.x, a!.y - b!.y) }
const toView = (cx: number, cy: number) => { const r = svgEl.value!.getBoundingClientRect(); return { x: vb.value.x + ((cx - r.left) / r.width) * vb.value.w, y: vb.value.y + ((cy - r.top) / r.height) * vb.value.h } }
const zoomBtn = (f: number) => { vb.value = zoomAt(vb.value, f, vb.value.x + vb.value.w / 2, vb.value.y + vb.value.h / 2) }
const resetView = () => { vb.value = { ...FULL } }
function onDown(e: PointerEvent) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) pinch = dist(); if (zoomed.value) svgEl.value?.setPointerCapture?.(e.pointerId) }
function onMove(e: PointerEvent) {
  const p = pts.get(e.pointerId); if (!p || !svgEl.value) return
  const r = svgEl.value.getBoundingClientRect(), dx = e.clientX - p.x, dy = e.clientY - p.y
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pts.size === 2) { const d = dist(); if (pinch > 0 && d > 0) { const [a, b] = [...pts.values()], c = toView((a!.x + b!.x) / 2, (a!.y + b!.y) / 2); vb.value = zoomAt(vb.value, d / pinch, c.x, c.y) } pinch = d }
  else if (pts.size === 1 && zoomed.value) vb.value = panBy(vb.value, (-dx / r.width) * vb.value.w, (-dy / r.height) * vb.value.h)
}
const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0 }
function onWheel(e: WheelEvent) { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const c = toView(e.clientX, e.clientY); vb.value = zoomAt(vb.value, e.deltaY < 0 ? 1.25 : 0.8, c.x, c.y) }
function onKey(e: KeyboardEvent) {
  const s = vb.value.w * 0.1
  if (e.key === '+' || e.key === '=') zoomBtn(1.4); else if (e.key === '-') zoomBtn(1 / 1.4); else if (e.key === '0') resetView()
  else if (e.key === 'ArrowLeft') vb.value = panBy(vb.value, -s, 0); else if (e.key === 'ArrowRight') vb.value = panBy(vb.value, s, 0)
  else if (e.key === 'ArrowUp') vb.value = panBy(vb.value, 0, -s); else if (e.key === 'ArrowDown') vb.value = panBy(vb.value, 0, s)
  else return
  e.preventDefault()
}
const rows = computed(() => regionRows(corpus.value?.regions, props.by ?? props.card?.stats.byRegion))
const max = computed(() => Math.max(0, ...rows.value.map(r => r.ipm ?? 0)))
const byOblast = computed(() => { const m = new Map<string, (typeof rows.value)[number]>(); for (const r of rows.value) for (const o of r.oblasts) m.set(o, r); return m })
const shapes = computed(() => (geo.value?.features ?? []).map(f => ({ code: f.properties.code, name: f.properties.name, d: pathOf(f), r: byOblast.value.get(f.properties.code) })))
const step = (r?: (typeof rows.value)[number]) => (r ? stepOf(r.ipm, max.value) : -1)
const describe = (s: { name: string; r?: (typeof rows.value)[number] }) => !s.r || s.r.N === 0 ? `${s.name}: немає пам’яток корпусу (невідомо)` : `${s.name}: регіон пам’ятки «${s.r.name}», ${fmtNum(s.r.ipm ?? 0, 1)} ipm, N = ${fmtNum(s.r.N)}`

// MP-2: historical territories — drawn dashed, counted per territory (witness regions of core/territories.ts), dialect group only via the AC gazetteer.
const terr = computed(() => TERRITORIES.map(t => {
  const f = hgeo.value?.features.find(x => x.properties.code === t.code), row = rows.value.find(r => r.oblasts.includes(t.code)), gaz = territoryGaz(t)
  return { t, d: f ? pathOf(f) : '', row, groups: gaz.map(g => g.group), ev: gaz.flatMap(g => territoryGroupEvidence(t, g)) }
}))
const hshapes = computed(() => terr.value.filter(x => x.d))
const hdescribe = (x: (typeof terr.value)[number]) => `${x.t.name}: історична українська територія; ${x.row && x.row.N > 0 ? `пам’яток регіону N = ${fmtNum(x.row.N)}` : 'немає пам’яток корпусу (невідомо)'}`
</script>

<template>
  <div v-if="!rows.length" class="small muted sans"><span class="unk" tabindex="0" title="немає даних — значення не встановлено (P-3.1)">невідомо</span>: у даних немає розподілу за регіонами пам’яток.</div>
  <div v-else class="regionmap" :class="{ 'rm-compact': compact }">
    <p class="small muted sans" style="margin-top:0">Регіон пам’ятки — це місце походження свідка (рукопису, видання), а <strong>не діалектна мітка</strong> слова. ipm = f / N · 10⁶ для токенів пам’яток регіону.</p>
    <div class="rm-grid">
      <div v-if="shapes.length" class="rm-wrap">
      <svg ref="svgEl" :viewBox="viewBox" role="group" aria-label="Карта регіонів пам’яток: відносна частота; клавіші + − 0 та стрілки — масштаб і зсув" :class="['rm-svg', { 'rm-zoomed': zoomed }]"
        @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" @wheel="onWheel" @keydown="onKey">
        <defs><pattern id="rm-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--surface-2)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted)" stroke-width="1.2" /></pattern></defs>
        <path v-for="s in hshapes" :key="s.t.code" :d="s.d" :class="['rm-o', 'rm-h', 'rm-s' + step(s.row)]" :fill="step(s.row) < 0 ? 'url(#rm-hatch)' : undefined" tabindex="0"
          :aria-label="hdescribe(s)" @mouseenter="hot = hdescribe(s)" @focus="hot = hdescribe(s)" @mouseleave="hot = null" @blur="hot = null"><title>{{ hdescribe(s) }}</title></path>
        <path v-for="s in shapes" :key="s.code" :d="s.d" :class="['rm-o', 'rm-s' + step(s.r)]" :fill="step(s.r) < 0 ? 'url(#rm-hatch)' : undefined" tabindex="0"
          :aria-label="describe(s)" @mouseenter="hot = describe(s)" @focus="hot = describe(s)" @mouseleave="hot = null" @blur="hot = null"><title>{{ describe(s) }}</title></path>
      </svg>
      <div class="rm-ctl" role="group" aria-label="Масштаб карти">
        <button type="button" class="rm-btn" aria-label="Збільшити" @click="zoomBtn(1.4)">+</button>
        <button type="button" class="rm-btn" aria-label="Зменшити" @click="zoomBtn(1 / 1.4)">−</button>
        <button type="button" class="rm-btn" aria-label="Скинути масштаб" :disabled="!zoomed" @click="resetView">⟲</button>
      </div>
      </div>
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
    <p class="small sans rm-legend" aria-label="Умовні позначки">
      <span class="rm-key rm-key-modern" aria-hidden="true" /> сучасна область (суцільна межа) · <span class="rm-key rm-key-hist" aria-hidden="true" /> історична українська територія (пунктирна межа)
    </p>
    <details class="small sans rm-terr">
      <summary>Історичні українські території на карті ({{ terr.length }}) — межа за джерелом, у дотику показано цитату</summary>
      <ul>
        <li v-for="x in terr" :key="x.t.code">
          <details><summary><strong>{{ x.t.name }}</strong> — історична українська територія; {{ x.row && x.row.N > 0 ? `пам’яток N = ${fmtNum(x.row.N)}` : 'немає пам’яток корпусу (невідомо)' }};
            {{ x.groups.length ? 'діалектна група за AC-gazetteer: ' + x.groups.join(', ') : 'діалектна група: невідомо (джерело не називає)' }}</summary>
            <p class="muted">На карті: {{ x.t.unit }}</p>
            <blockquote v-for="e in [...x.t.src, ...x.ev]" :key="e.locator + e.quote" class="rm-q">«{{ e.quote }}» — <a :href="e.locator.split(', ')[0]" target="_blank" rel="noopener">{{ e.source }} ↗</a>, {{ e.locator.includes(', ') ? e.locator.split(', ').slice(1).join(', ') : 'вступ статті' }}</blockquote>
          </details>
        </li>
      </ul>
      <p class="muted">Не показано: <template v-for="(n, i) in TERRITORIES_NOT_DRAWN" :key="n.name">{{ i ? '; ' : '' }}{{ n.name }} — {{ n.why }}</template>. Контури: Natural Earth (public domain), адміністративні одиниці, що лише наближають описаний у джерелі обсяг [P].</p>
    </details>
    <p class="small muted sans" style="margin-bottom:0">Штрихування — у корпусі немає пам’яток цього регіону (невідомо, не нуль). Крим і Севастополь показано як частину України (ISO 3166-2:UA). Межі: Natural Earth (public domain), спрощено.</p>
  </div>
</template>
