// Regenerates ukr-oblasts.json from Natural Earth 10m admin-1 (public domain): node build-ukr-oblasts.mjs path/to/ne_10m_admin_1_states_provinces.geojson
// Source: https://github.com/nvkelso/natural-earth-vector (geojson/ne_10m_admin_1_states_provinces.geojson). Selection is by ISO 3166-2:UA code, NOT by NE's
// admin0 field: Natural Earth files Crimea (UA-43) and Sevastopol (UA-40) under Russia, but ISO 3166-2:UA lists them as Ukrainian first-level divisions and the
// project treats them as Ukraine. Geometry is Douglas-Peucker simplified (0.012 deg) and rounded to 2 decimals to stay under 100 KB.
import { readFileSync, writeFileSync } from 'node:fs'
const NAMES = { 'UA-05': 'Вінницька область', 'UA-07': 'Волинська область', 'UA-09': 'Луганська область', 'UA-12': 'Дніпропетровська область', 'UA-14': 'Донецька область',
  'UA-18': 'Житомирська область', 'UA-21': 'Закарпатська область', 'UA-23': 'Запорізька область', 'UA-26': 'Івано-Франківська область', 'UA-30': 'м. Київ', 'UA-32': 'Київська область',
  'UA-35': 'Кіровоградська область', 'UA-40': 'м. Севастополь', 'UA-43': 'Автономна Республіка Крим', 'UA-46': 'Львівська область', 'UA-48': 'Миколаївська область',
  'UA-51': 'Одеська область', 'UA-53': 'Полтавська область', 'UA-56': 'Рівненська область', 'UA-59': 'Сумська область', 'UA-61': 'Тернопільська область',
  'UA-63': 'Харківська область', 'UA-65': 'Херсонська область', 'UA-68': 'Хмельницька область', 'UA-71': 'Черкаська область', 'UA-74': 'Чернігівська область', 'UA-77': 'Чернівецька область' }
const TOL = 0.012
const d2 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1]; return x * x + y * y }
function dp(pts, tol) { if (pts.length < 3) return pts; let m = 0, k = 0; for (let i = 1; i < pts.length - 1; i++) { const d = d2(pts[i], pts[0], pts.at(-1)); if (d > m) { m = d; k = i } }
  return m > tol * tol ? [...dp(pts.slice(0, k + 1), tol).slice(0, -1), ...dp(pts.slice(k), tol)] : [pts[0], pts.at(-1)] }
const ring = r => { const s = dp(r, TOL).map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)]); return s.length >= 4 ? s : null }
const poly = p => { const rs = p.map(ring).filter(Boolean); return rs.length ? rs : null }
const src = JSON.parse(readFileSync(process.argv[2], 'utf8')), features = []
for (const f of src.features) {
  const code = f.properties.iso_3166_2; if (!NAMES[code]) continue
  const ps = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map(poly).filter(Boolean)
  features.push({ type: 'Feature', properties: { code, name: NAMES[code] }, geometry: ps.length === 1 ? { type: 'Polygon', coordinates: ps[0] } : { type: 'MultiPolygon', coordinates: ps } })
}
if (features.length !== 27) throw new Error('expected 27 first-level divisions, got ' + features.length)
writeFileSync(new URL('./ukr-oblasts.json', import.meta.url), JSON.stringify({ type: 'FeatureCollection', attribution: 'Natural Earth (public domain), admin-1 10m; ISO 3166-2:UA codes; simplified', features }))
