/**
 * Region map helpers (research/07 §3.3). public/geo/ukr-oblasts.json = Natural Earth admin-1 (public domain), ISO 3166-2:UA keys, Crimea (UA-43) and
 * Sevastopol (UA-40) included as Ukraine. A "region" is the REGION OF A WITNESS (SPEC 20 B-3.6), never a dialect claim.
 */
import type { CorpusMeta, LemmaStats } from '../../core/types.ts'

export interface GeoFeature { properties: { code: string; name: string }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] } }
export interface Geo { attribution: string; features: GeoFeature[] }
export const LON0 = 22, LON1 = 40.4, LAT0 = 44.2, LAT1 = 52.5, KX = Math.cos((48.3 * Math.PI) / 180)
export const VIEW = { w: Math.round((LON1 - LON0) * KX * 40), h: Math.round((LAT1 - LAT0) * 40) }
const px = (lon: number, lat: number) => `${(((lon - LON0) / (LON1 - LON0)) * VIEW.w).toFixed(1)},${(((LAT1 - lat) / (LAT1 - LAT0)) * VIEW.h).toFixed(1)}`
export function pathOf(f: GeoFeature): string {
  const polys = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][]
  return polys.map(p => p.map(r => 'M' + r.map(([x, y]) => px(x!, y!)).join('L') + 'Z').join('')).join('')
}

let geo: Promise<Geo> | undefined
export const loadGeo = () => (geo ??= fetch('./geo/ukr-oblasts.json').then(r => { if (!r.ok) throw new Error(`ukr-oblasts.json: HTTP ${r.status}`); return r.json() as Promise<Geo> }))

export interface RegionRow { code: string; name: string; oblasts: string[]; f: number; N: number; ipm: number | undefined }
/** byRegion × corpus.regions → rows with ipm = f/N·10⁶ (P-1.6: N always kept); a region without tokens has ipm undefined = unknown, never 0. */
export function regionRows(regions: CorpusMeta['regions'] | undefined, by: LemmaStats['byRegion']): RegionRow[] {
  if (!regions) return []
  const m = new Map((by ?? []).map(b => [b.code, b]))
  return regions.map(r => { const b = m.get(r.code), N = b?.N ?? r.N, f = b?.f ?? 0; return { code: r.code, name: r.name, oblasts: r.oblasts, f, N, ipm: N > 0 ? (f / N) * 1e6 : undefined } })
}
/** Five-step sequential classes by ipm relative to the maximum (0 = none attested). */
export const stepOf = (ipm: number | undefined, max: number) => (ipm === undefined ? -1 : ipm <= 0 || max <= 0 ? 0 : Math.min(4, 1 + Math.floor((ipm / max) * 4 - 1e-9)))
