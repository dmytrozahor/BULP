<script setup lang="ts">
import { isOldForm } from '../lib/nav.ts'
/**
 * NP-3 /map: the gazetteer (public/data/places.json) on Leaflet + OpenStreetMap tiles. Leaflet and its CSS are a separate chunk, imported only when this route opens.
 * Coordinates are Wikidata P625 (CC0); every marker links to the word card and lists the corpus spellings (the variant cluster). Tiles: © OpenStreetMap contributors (ODbL).
 * A plain table below the map carries the same data (no-JS-map / screen-reader path).
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { PlaceOut, PlacesFile } from '../../core/places.ts'
import { loadPlaces, osmLink } from '../lib/placesData.ts'
import { loadHistorical } from '../lib/geo.ts'
import { TERRITORIES, territoryGaz, type Territory } from '../../core/territories.ts'
import { fmtDate } from '../lib/format.ts'
const route = useRoute()
const data = ref<PlacesFile>(), err = ref(''), el = ref<HTMLDivElement>()
let map: import('leaflet').Map | undefined, markers = new Map<string, import('leaflet').Layer>()

const popup = (p: PlaceOut) => {
  const d = document.createElement('div'), esc = (s: string) => { const t = document.createElement('span'); t.textContent = s; return t.innerHTML }
  d.innerHTML = `<strong>${esc(p.name)}</strong> <small>${esc(p.qid)}</small><br>${p.n} токенів у ${p.nW} пам’ятках`
    + (p.earliest ? `<br>найраніше: ${esc(p.earliest.raw)}, ${esc(fmtDate(p.earliest.date))}` : '')
    + `<br>написання: ${p.variants.slice(0, 6).map(v => esc(v.raw)).join(', ')}`
    + `<br><a href="#/w/${encodeURIComponent(p.lemma)}">картка слова →</a>`
  return d
}

/** Popup of a historical territory: label, the cited source quote + locator (MP-1), the AC-gazetteer group only where a source states it (MP-2). */
const territoryPopup = (t: Territory) => {
  const d = document.createElement('div'), esc = (s: string) => { const x = document.createElement('span'); x.textContent = s; return x.innerHTML }, g = territoryGaz(t).map(r => r.group)
  d.innerHTML = `<strong>${esc(t.name)}</strong><br><em>історична українська територія</em><br>діалектна група: ${g.length ? esc(g.join(', ')) + ' (AC-gazetteer)' : 'невідомо (джерело не називає)'}`
    + t.src.map(e => `<blockquote>«${esc(e.quote)}»<br><a href="${esc(e.locator.split(', ')[0]!)}" target="_blank" rel="noopener">${esc(e.source)} ↗</a>, ${esc(e.locator.split(', ').slice(1).join(', '))}</blockquote>`).join('')
    + `<small>На карті: ${esc(t.unit)}</small>`
  return d
}

async function draw() {
  if (!data.value || !el.value) return
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  map?.remove(); markers = new Map()
  map = L.map(el.value, { scrollWheelZoom: false }).setView([49.5, 30], 5)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">учасники OpenStreetMap</a>' }).addTo(map)
  // MP-1/MP-2/MP-3: historical Ukrainian territories first (under the markers), dashed in the --map-hist token colour; marker colours are tokens too
  const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || undefined
  try {
    const h = await loadHistorical()
    L.geoJSON(h as unknown as import('geojson').FeatureCollection, {
      style: () => ({ color: css('--map-hist'), weight: 2, dashArray: '6 4', fillColor: css('--map-hist'), fillOpacity: 0.12 }),
      onEachFeature: (f, l) => { const t = TERRITORIES.find(x => x.code === f.properties?.code); if (t) { l.bindTooltip(`${t.name} — історична українська територія`); l.bindPopup(() => territoryPopup(t)) } },
    }).addTo(map)
  } catch { /* the historical layer is optional */ }
  for (const p of data.value.places) {
    const layer: import('leaflet').Layer = p.line
      ? L.polyline(p.line, { color: css('--map-line'), weight: 3, dashArray: '6 6' }).bindPopup(() => popup(p))
      : L.circleMarker(p.pt, { radius: 5 + Math.min(10, Math.log10(p.n + 1) * 3), color: css('--map-dot'), weight: 2, fillOpacity: 0.55 }).bindPopup(() => popup(p))
    layer.bindTooltip(p.name).addTo(map); markers.set(p.id, layer)
  }
  focus()
}
function focus() {
  const q = route.query['place'], id = Array.isArray(q) ? q[0] : q, p = data.value?.places.find(x => x.id === id || x.name === id)
  const layer = p && markers.get(p.id)
  if (p && layer && map) { map.setView(p.pt, 7); layer.openPopup?.() }
}
onMounted(async () => { try { data.value = await loadPlaces(); await new Promise(r => setTimeout(r, 0)); await draw() } catch (e) { err.value = String((e as Error).message ?? e) } })
watch(() => route.query['place'], focus)
onBeforeUnmount(() => { map?.remove(); map = undefined })
</script>

<template>
  <section>
    <h1>Мапа топонімів</h1>
    <p class="muted sans small">Координати — Wikidata (P625, CC0); кількості й написання — з корпусу. Історичні назви (Киевъ, Кыевъ…) беруться з пам’яток, а не з Вікідані.
      Мапа: © учасники <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.</p>
    <p class="muted sans small maplegend"><span class="mk mk-dot" aria-hidden="true" /> топонім із корпусу · <span class="mk mk-line" aria-hidden="true" /> ріка · <span class="mk mk-hist" aria-hidden="true" /> історична українська територія за межами сучасної України (Кубань, Холмщина, Підляшшя, Берестейщина, Надсяння, Лемківщина, Пряшівщина, Мармарощина, Південна Буковина, Стародубщина, Білгородщина, Воронежчина, Курщина) — пунктир; джерело й цитата — у спливному вікні. Дотик і перетягування — зсув, щипок або +/− — масштаб.</p>
    <p v-if="err" class="fixture err" role="alert">{{ err }}</p>
    <div ref="el" class="placemap" role="img" aria-label="Мапа топонімів із корпусу" />
    <table v-if="data" class="sans small placetable">
      <caption>Топоніми корпусу ({{ data.places.length }}); N корпусу = {{ data.N }} токенів</caption>
      <thead><tr><th>Назва</th><th>Wikidata</th><th>токенів</th><th>найраніше</th><th>написання (найчастіші)</th></tr></thead>
      <tbody>
        <tr v-for="p in data.places" :key="p.id">
          <td><RouterLink :to="`/w/${encodeURIComponent(p.lemma)}`">{{ p.name }}</RouterLink> <a :href="osmLink(p.pt[0], p.pt[1])" target="_blank" rel="noopener" title="на OpenStreetMap">↗</a></td>
          <td><a :href="`https://www.wikidata.org/wiki/${p.qid}`" target="_blank" rel="noopener">{{ p.qid }}</a></td>
          <td>{{ p.n }}</td><td>{{ p.earliest ? fmtDate(p.earliest.date) : '' }}</td>
          <td :class="['lang', { old: p.variants.some(v => isOldForm(v.raw)) }]">{{ p.variants.slice(0, 5).map(v => v.raw + '×' + v.f).join(', ') }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.placemap { height: 28rem; max-width: 100%; border: 1px solid var(--line); margin: .5rem 0 1rem; }
.mk { display: inline-block; width: 1.4rem; height: .7rem; vertical-align: middle; } .mk-dot { border: 2px solid var(--map-dot); border-radius: 50%; width: .8rem; height: .8rem; } .mk-line { border-top: 3px dashed var(--map-line); height: 0; } .mk-hist { border: 2px dashed var(--map-hist); background: var(--map-hist-fill); }
@media (max-width: 480px) { .placemap { height: 22rem; } .placetable { display: block; overflow-x: auto; } }
.placetable { border-collapse: collapse; width: 100%; }
.placetable th, .placetable td { text-align: left; padding: .2rem .5rem; border-bottom: 1px solid var(--line); }
</style>
