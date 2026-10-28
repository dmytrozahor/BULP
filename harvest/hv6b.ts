/**
 * SPEC 63 HV-6b: records whose volume prints no «Зап. … пов.» footer. The place of recording is recovered from the volume's own text:
 *  (a) songs signed with a village at their end («2991. Ой зійшов я сьвіт … (Руда Сїлецька).», Коломийки тт. 17–19) → grouped per village → county through the volume's OWN index of places
 *      («Сі села приналежать до ось яких повітів: 1. Бережани (Вишки, Гиновичі, …)», т. 17), every hit citing the index line;
 *  (b) a village named in a footer WITHOUT a county («у Керестурі», Hungarian-Rus volumes) → region through a cited gazetteer table `data/seed/hv6-villages.json` (harvest/hv6-gazetteer.ts: Wikidata, per village, QID and URL kept).
 * An ambiguous village (two different counties in the index, several settlements of that name in the gazetteer) stays unresolved; nothing is guessed. A tag that is no village of the index (collector initials «Кнг.», «Грг.») stays unplaced.
 */
import { readFileSync, existsSync } from 'node:fs'
import { lookupCounty, type PlaceRow } from './hv6-places.ts'
import { oqGate, type Footer, type Rec } from './hv6.ts'

/** the key of a village name in an index / tag: lower case, ї ѣ → і, no punctuation */
export const villageKey = (v: string) => v.toLowerCase().replace(/[їѣ]/g, 'і').replace(/[«»„"“”.,;:()[\]^%*]/g, '').replace(/\s+/g, ' ').trim()
export interface VillageHit { county: PlaceRow; line: number; quote: string }
export type VillageIndex = Record<string, VillageHit[]>

/** «N. Бережани (Вишки, Гиновичі, …).» blocks of a volume's index of places: village → the county the block is headed by (every hit keeps its line and quote) */
export function parseVillageIndex(text: string): VillageIndex {
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim())
  const out: VillageIndex = {}
  for (let i = 0; i < lines.length; i++) {
    const m = /^\d{1,2}\. ([А-ЯІЇЄҐ][а-яіїєґ'’ .-]{2,30}?) \((.*)$/u.exec(lines[i]!)
    if (!m || !/^[А-ЯІЇЄҐ][^,;]*,/u.test(m[2]!)) continue
    let body = m[2]!, k = i
    while (!/\)\.?\s*$/.test(body) && k < i + 4 && k + 1 < lines.length && lines[k + 1]) { k++; body += (/[-¬]$/.test(body) ? '' : ' ') + lines[k]!.replace(/^¬/, '') }
    body = body.replace(/[¬­]\s*/g, '')
    const county = lookupCounty(m[1]!.split(/\s+/)[0]!)
    if (!county) continue
    const quote = `${m[1]} (${body}`.slice(0, 200)
    for (const v of body.replace(/\)\.?\s*$/, '').split(',')) {
      const key = villageKey(v.replace(/\s+н\.\s*[А-ЯІЇЄҐ]\.?$/u, ''))
      if (key.length >= 3) (out[key] ??= []).push({ county, line: i + 1, quote })
    }
  }
  return out
}
export function mergeIndex(a: VillageIndex, b: VillageIndex): VillageIndex { const o: VillageIndex = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = [...(o[k] ?? []), ...v]; return o }
/** the unique county of a village in an index; two different counties = ambiguous = null */
export function villageCounty(idx: VillageIndex, village: string): VillageHit | null {
  const hits = idx[villageKey(village)]
  if (!hits?.length) return null
  return new Set(hits.map(h => h.county.name)).size === 1 ? hits[0]! : null
}

const NOTE = /^(?:Пор\.|Порівн|Див\.|Варіянт|Паралел)|(?:\bстр\.|\bст\.\s*\d|\bч\.\s*\d|\bЗб\.|Записки)/u
const TAG = /\(([А-ЯІЇЄҐ][а-яіїєґ'’ .-]{2,30})\)\s*\.?\s*$/u
export interface TaggedStats { tagged: number; placed: number; unresolved: number; ambiguous: number; villages: number }
/** numbered songs grouped by the village tag at their end; one record = all songs of one village in the volume */
export function splitTagged(text: string, idx: VillageIndex, vol: { vol: string; year: number }): { records: Rec[]; stats: TaggedStats } {
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim())
  const groups = new Map<string, { village: string; first: number; texts: string[] }>()
  const stats: TaggedStats = { tagged: 0, placed: 0, unresolved: 0, ambiguous: 0, villages: 0 }
  let cur: string[] = [], start = 0
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!
    if (!l) continue
    if (NOTE.test(l)) { cur = []; continue }
    if (!cur.length) { if (!/^\d{1,5}\. \S/u.test(l)) continue; start = i + 1 }   // a song starts at its number; running text between songs is skipped
    cur.push(l.replace(/^\d{1,5}\.\s*/, ''))
    const t = TAG.exec(l)
    if (t) {
      stats.tagged++
      const key = villageKey(t[1]!), g = groups.get(key) ?? { village: t[1]!.replace(/\.$/, ''), first: start, texts: [] }
      g.texts.push(cur.join('\n').replace(TAG, '').trim()); groups.set(key, g); cur = []
    } else if (cur.length > 12) cur = []
  }
  const records: Rec[] = []
  let n = 0
  for (const [key, g] of groups) {
    const hit = villageCounty(idx, g.village)
    if (!hit) { if (idx[key]?.length) stats.ambiguous++; else stats.unresolved++; continue }
    const body = g.texts.join('\n')
    if (!oqGate(body).ok) continue
    const c = hit.county
    const footer: Footer = { region: c.region, regionIso: c.iso, county: c.name, countyKind: c.kind, village: g.village, year: null, collector: null, quote: `${g.texts.length} пісень з підписом «(${g.village})»; село → повіт за покажчиком: ${hit.quote}` }
    records.push({ n: ++n, title: `пісні з села ${g.village}`, text: body, footer, page: null, line: g.first, date: vol.year, dateBasis: `volume year ${vol.year} (recording year not stated; the songs are signed with the village)` })
    stats.placed += g.texts.length; stats.villages++
  }
  return { records, stats }
}
/** volumes whose songs are signed with a village at the end (Коломийки тт. 17–19); the index of places is printed in т. 17 */
export const HV6_TAGGED = new Set(['etnohr_17', 'etnohr_18', 'etnohr_19'])

// ── (b) cited gazetteer for villages named without a county ────────────────────────────────────────
export interface GazVillage { region: string; iso: string[]; qid: string; label: string; admin: string; url: string; retrieved: string }
export const GAZ_PATH = 'data/seed/hv6-villages.json'
let gaz: Record<string, GazVillage> | null = null
export function gazetteer(): Record<string, GazVillage> {
  if (!gaz) { try { gaz = existsSync(GAZ_PATH) ? JSON.parse(readFileSync(GAZ_PATH, 'utf8')) as Record<string, GazVillage> : {} } catch { gaz = {} } }
  return gaz
}
export const gazVillage = (v: string): GazVillage | null => gazetteer()[villageKey(v)] ?? null
