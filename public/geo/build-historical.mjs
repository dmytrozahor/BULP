/**
 * SPEC 63 MP-1: public/geo/historical.json = Natural Earth 10m admin-1 (public domain) units that approximate the historical / ethnographic
 * Ukrainian territories outside today's borders. USAGE: node public/geo/build-historical.mjs <ne_10m_admin_1_states_provinces.geojson>
 * (https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson — public domain, naturalearthdata.com/about/terms-of-use).
 *
 * A territory's extent is NOT the admin unit: the ethnographic sources (core/territories.ts) describe it in words; the unit is a drawing aid chosen by the
 * project [P] and, where the source says only a part is Ukrainian («southern part of the oblast»), clipped to a lat/lon box. The box is stated per row.
 * Output is simplified (Douglas-Peucker 0.03 deg, 2 decimals) to stay far below the 256 KiB lazy-file budget.
 */
import fs from 'node:fs'
import { TERRITORIES } from '../../core/territories.ts'

const src = process.argv[2]
if (!src) throw new Error('usage: node build-historical.mjs <ne admin-1 geojson>')
const ne = JSON.parse(fs.readFileSync(src, 'utf8'))

function dpRing(r, tol) {   // closed ring: split at the point farthest from the start, simplify both halves
  let k = 1, dm = -1; for (let i = 1; i < r.length - 1; i++) { const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]); if (d > dm) { dm = d; k = i } }
  return [...dp(r.slice(0, k + 1), tol).slice(0, -1), ...dp(r.slice(k), tol)]
}
function dp(pts, tol) {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop(); let dmax = 0, im = -1
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / L; if (d > dmax) { dmax = d; im = i } }
    if (dmax > tol && im > 0) { keep[im] = 1; stack.push([a, im], [im, b]) }
  }
  return pts.filter((_, i) => keep[i])
}
/** Sutherland-Hodgman against an axis-aligned box [x0,y0,x1,y1]. */
function clip(ring, [x0, y0, x1, y1]) {
  const edges = [[p => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]],
    [p => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [p => p[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]],
    [p => p[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]]]
  let out = ring.slice(0, -1)
  for (const [inside, cut] of edges) {
    const inp = out; out = []
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length]
      if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b) } else if (inside(a)) out.push(cut(a, b))
    }
    if (!out.length) return null
  }
  out.push(out[0]); return out
}

const fold = s => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const features = []
for (const t of TERRITORIES) {
  const polys = []
  for (const u of t.ne) {
    const f = ne.features.find(x => x.properties.adm0_a3 === u.adm0 && fold(x.properties.name) === fold(u.name))
    if (!f) throw new Error(`NE unit not found: ${u.adm0} ${u.name}`)
    const ps = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const p of ps) {
      const rings = p.map(r => (u.clip ? clip(r, u.clip) : r)).filter(Boolean).map(r => dpRing(r, 0.03).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])).filter(r => r.length >= 4)
      if (rings.length) polys.push(rings)
    }
  }
  features.push({ type: 'Feature', properties: { code: t.code, name: t.name }, geometry: { type: 'MultiPolygon', coordinates: polys } })
}
const out = {
  type: 'FeatureCollection',
  attribution: 'Natural Earth (public domain), admin-1 10m; units chosen and clipped by the project [P] as drawing aids for the territories of core/territories.ts; simplified',
  licence: 'Natural Earth: public domain (naturalearthdata.com/about/terms-of-use)',
  features,
}
fs.writeFileSync(new URL('./historical.json', import.meta.url), JSON.stringify(out))
console.log('historical.json', JSON.stringify(out).length, 'bytes', features.map(f => f.properties.code + ':' + f.geometry.coordinates.length).join(' '))
