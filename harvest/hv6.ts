/**
 * SPEC 63 HV-6 (owner 2026-10-22: raise the dialect-class coverage towards 80 %): REGIONAL dialect texts from «Етноґрафічний збірник» (НТШ, Львів, 1895–1929) and «Матеріали до українсько-руської етнольоґії»
 * (НТШ, 1899–): folk tales, songs, legends, descriptions, each printed with the place and year of recording and the collector («Зап. 1908 р. в Зеленици, Надвірн. пов., від …, А. Онищук»).
 * Source = the archive.org OCR text `<id>_djvu.txt` of the scans (archive.org robots.txt: only /control/ and /report/ disallowed; its download API is open; pacing 2 s). PD: published 1895–1929 (editors † ≤ 1926 / NTSh).
 * One volume = one batch file `items/<ia>.gz` (JSON array of record texts) + one index line per RECORD {id, region, regionIso, county, village, date, dateBasis, collector, page, quote, oq…} + a last `hv6v:` volume line (the done marker).
 * A record is the text between two footers («Зап. …»), cut after its numbered heading; the editors' notes/parallels/Polish-Russian-German apparatus paragraphs are dropped; a record needs a footer whose COUNTY is in
 * harvest/hv6-places.ts (the region is read from the county the record itself names — never guessed from the village or from the dialect), else it is counted as unplaced and not stored.
 * DATE = the recording year of the footer; none stated → the volume year, labelled `dateBasis: volume`. OQ: the old scans are noisy, so a record must pass the gate below (tuned on etnohr_26, etnohr_12, etnograf_zb_35).
 * Usage: tsx harvest/hv6.ts   (resumable; index.jsonl is the truth; the volume line is written last)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { Harvest, ROOT_DIR, decisionNeeded, type IndexItem } from './lib.ts'
import { PLACES, REGION_WORDS, lookupCounty, type PlaceRow } from './hv6-places.ts'
import { HV6_TAGGED, gazVillage, mergeIndex, parseVillageIndex, splitTagged, type VillageIndex } from './hv6b.ts'

export interface Hv6Volume { ia: string; series: 'ЕЗ' | 'МУЕ'; vol: string; year: number }
const v = (ia: string, vol: string, year: number, series: Hv6Volume['series'] = 'ЕЗ'): Hv6Volume => ({ ia, series, vol, year })
/** one scan per volume. Found by archive.org advancedsearch + item metadata 2026-10-22; every item has a `_djvu.txt` text layer; none states a licence (PD by the publication year ≤ 1929). */
export const HV6_VOLUMES: Hv6Volume[] = [
  v('etnohr_1', '1', 1895), v('etnohrT2', '2', 1896), v('etnohr_03-1', '3', 1897), v('etnohr_4', '4', 1898), v('etnohr_5', '5', 1898), v('etnohr_6', '6', 1899), v('etnohr_7', '7', 1899), v('etnohr_8', '8', 1900), v('etnohr_9', '9', 1900),
  v('etnohr_10', '10', 1901), v('etnohr_11', '11', 1901), v('etnohr_12', '12', 1902), v('etnohr_13', '13', 1902), v('etnohr_14', '14', 1904), v('etnohr_15', '15', 1904), v('etnohr_16', '16', 1905), v('etnohr_17', '17', 1905),
  v('etnohr_18', '18', 1906), v('etnohr_19', '19', 1907), v('etnohr_21', '21', 1906), v('etnohr_22', '22', 1908), v('etnohr_23', '23', 1907), v('etnohr_24', '24', 1908), v('etnohr_25', '25', 1909), v('etnohr_26', '26', 1910),
  v('etnohr_27', '27', 1909), v('etnohr_28', '28', 1910), v('etnohr_29', '29', 1910), v('etnoZb30', '30', 1911), v('etnograf_zb_33_201901', '31-32', 1912), v('etnograf_zb_33', '33', 1912), v('etnograf_zb_34', '34', 1912),
  v('etnograf_zb_35', '35', 1914), v('etnograf_zb_36', '36', 1914), v('etnograf_zb_37-38', '37-38', 1916), v('etnograf_zb_39-40', '39-40', 1929),
  v('etmol0gi', '1', 1899, 'МУЕ'),
]
/** found on archive.org but NOT harvested, with the reason (DECISIONS-NEEDED + the report) */
export const HV6_DUPES: Record<string, string> = {
  'etnohr_37-38': 'the same volume as etnograf_zb_37-38 (identical text layer, 2.6 MB)',
  'etnografichnyizb1519nauk': 'Т. 15 (1904) mis-dated 1895 by the uploader; the same volume as etnohr_15',
  'etnologia': 'the same volume as etmol0gi (Матеріали до українсько-руської етнольоґії, т. 1, 1899); the second scan has a shorter text layer',
  'etnografichnyzb00komigoog': 'Google scan, text layer is Latin-letter garbage (volume not identifiable); fails the OQ gate',
  'etnohr_zbirnyk': 'a collection record of all volumes without its own text layer',
  'jbc.bj.uj.edu.pl.NDIGCZAS015543_1895_001..1899_007 and NDIGCZAS015627_1929_039_040': 'Jagiellonian Library copies of Т. 1–7 and 39–40; the volumes are taken from the etnohr_* scans (one scan per volume)',
}
export const HV6_MISSING = ['Етноґрафічний збірник т. 20', 'Матеріали до українсько-руської етнольоґії т. 2 ff. (1900–1929): not on archive.org by title search 2026-10-22 («Матеріяли до етнології» 1931 is a different series of ВУАН/НТШ after 1929)']

// ── footer (place of recording) ───────────────────────────────────────────────────────────────────────
const CAP = 'А-ЯІЇЄҐ'
const FOOTER_START = /^(?:За[пн][.,]|Записа\p{L}*|Зібрав\p{L}*|Зпбрав\p{L}*)(?=\s|$)/u
export interface Footer { region: string; regionIso: string[]; county: string; countyKind: string; village: string | null; year: number | null; collector: string | null; quote: string }
const flat = (s: string) => s.replace(/[¬­]\s*/g, '').replace(/\s+/g, ' ').trim()

/** the place, year and collector a footer states; null when no county/governorate/region of the table is named (the record is then not placed) */
export function parseFooter(raw: string, volYear: number): Footer | null {
  const t = flat(raw)
  const ys = [...t.matchAll(/\b(1[89]\d\d)\b/g)].map(m => +m[1]!).filter(y => y >= 1800 && y <= volYear)
  let row: PlaceRow | null = null, at = -1, tokenEnd = 0
  const kw = /([\p{L}'’.\-]{3,})[\s,.]*(?:пов(?:іт\p{L}*)?(?=[\s.,;^%]|$)|ком(?:ітат\p{L}*)?(?=[\s.,;]|$)|стол(?:иці|иця|иц\p{L}*)?(?=[\s.,;]|$)|губ(?:ерні\p{L}*)?(?=[\s.,;]|$))/giu
  for (const m of t.matchAll(kw)) { const r = lookupCounty(m[1]!); if (r) { row = r; at = m.index!; tokenEnd = at + m[0].length; break } }
  if (!row) { const m = t.match(new RegExp(`пов(?:іт)?\\.\\s+\\p{L}?([${CAP}][\\p{L}'’-]+)`, 'u')); if (m) { const r = lookupCounty(m[1]!); if (r) { row = r; at = m.index!; tokenEnd = at + m[0].length } } }
  if (!row) for (const m of t.matchAll(/[\p{L}'’-]{4,}/gu)) { const r = lookupCounty(m[0], REGION_WORDS); if (r) { row = r; at = m.index!; tokenEnd = at + m[0].length; break } }
  if (!row) return null
  // village: the last capitalised word(s) after «в/у/з» before the county token
  const before = t.slice(0, at), pre = new RegExp(`(?:^|[\\s,])(?:в|у|во|із|з|зі)\\s+(?:с\\.\\s*|селі\\s+|м\\.\\s*)?([${CAP}][\\p{L}'’-]{2,}(?:\\s+[${CAP}][\\p{L}'’-]{2,})?)(?:\\s*\\([^)]*\\))?[\\s,]*$`, 'u').exec(before)
  const village = pre?.[1] ?? null
  // collector: «Зап. <Ім'я Прізвище> у/в <село>» or the last comma segment of the footer
  let collector: string | null = null
  const nameRe = `[${CAP}][\\p{L}.'’-]+(?:\\s+[${CAP}][\\p{L}.'’-]+){0,2}`
  const lead = new RegExp(`^(?:За[пн][.,]?|Записа\\p{L}*|Зібрав\\p{L}*)\\s+(${nameRe})\\s+(?:в|у)\\s`, 'u').exec(t)
  if (lead && lead[1]!.split(/\s+/).length >= 2) collector = lead[1]!
  else {
    const seg = t.slice(tokenEnd).split(',').map(s => s.trim()).filter(Boolean), last = seg[seg.length - 1]?.replace(/[.\s^%]+$/, '')
    if (seg.length >= 2 && last && new RegExp(`^${nameRe}$`, 'u').test(last) && !/^(Від|Зап)/.test(last) && last.length <= 40 && /\p{Ll}{3}|\.\s*[${CAP}]/u.test(last)) collector = last
  }
  return { region: row.region, regionIso: row.iso, county: row.name, countyKind: row.kind, village, year: ys[0] ?? null, collector, quote: t.slice(0, 240) }
}

/** HV-6b: a footer that names only a village («у Керестурі»): the cited gazetteer (data/seed/hv6-villages.json) decides; an ambiguous or unknown village is not placed */
export function footerByVillage(raw: string, volYear: number, allowed?: Set<string>): Footer | null {
  const t = flat(raw)
  const m = new RegExp(`(?:^|[\\s,])(?:в|у)\\s+([${CAP}][\\p{L}'’-]{2,})`, 'u').exec(t)
  const g = m ? gazVillage(m[1]!) : null
  // a label that is unique in Wikidata can still be another settlement than the one the editor meant: the region must be one that the SAME volume already places by county footers
  if (!m || !g || (allowed && !allowed.has(g.region))) return null
  const ys = [...t.matchAll(/\b(1[89]\d\d)\b/g)].map(x => +x[1]!).filter(y => y >= 1800 && y <= volYear)
  return { region: g.region, regionIso: g.iso, county: g.admin, countyKind: 'gazetteer', village: m[1]!, year: ys[0] ?? null, collector: null, quote: `${t.slice(0, 160)} ⁞ село → ${g.admin}: Wikidata ${g.qid} ${g.url} (${g.retrieved})` }
}

// ── OQ gate for an old scan record ────────────────────────────────────────────────────────────────────
const VOWEL = /[аеєиіїоуюяѣ]/i
export interface Oq { tokens: number; plausible: number; latin: number; vowelless: number; repeats: number }
/** record-level OCR gate (SPEC 63 OQ, tuned for the 1895–1929 scans): ≥ 40 words; ≥ 85 % plausible words (Cyrillic only, 2–24 letters with a vowel, no triple letter); Latin/digit junk ≤ 3 % of the characters. */
export function oqGate(text: string): { ok: boolean; reason?: string; oq: Oq } {
  const words = text.match(/[\p{L}\p{M}'’ʼ-]+/gu) ?? []
  let plausible = 0, vowelless = 0, repeats = 0
  for (const w of words) {
    const pure = /^[\p{Script=Cyrillic}\p{M}'’ʼ-]+$/u.test(w), len = w.replace(/[^\p{L}]/gu, '').length
    const vow = VOWEL.test(w), rep = /(.)\1\1/u.test(w)
    if (!vow && len > 1) vowelless++
    if (rep) repeats++
    if (pure && len <= 24 && !rep && ((len >= 2 && vow) || /^[авзсукйжбі]$/i.test(w))) plausible++   // one-letter words (в, з, с, у, й, а, і …) are normal Ukrainian
  }
  const letters = (text.match(/\p{L}/gu) ?? []).length || 1, latin = (text.match(/[A-Za-z\d§£$¥]/g) ?? []).length
  const oq: Oq = { tokens: words.length, plausible: words.length ? plausible / words.length : 0, latin: latin / letters, vowelless, repeats }
  if (words.length < 40) return { ok: false, reason: 'too-short', oq }
  if (oq.plausible < 0.85) return { ok: false, reason: 'low-plausible', oq }
  if (oq.latin > 0.03) return { ok: false, reason: 'latin-junk', oq }
  return { ok: true, oq }
}

// ── splitting a volume into records ──────────────────────────────────────────────────────────────────
const NOTE_START = /^(Паралел|Пор\.|Порівн|Див\.|Варіянт|Прим\.|Cf|Ср\.|Вар\.)/u
const NOTE_REF = /(?:\bстр\.|\bст\.\s*\d|\bт\.\s*[IVXІ]+\b|\bч\.\s*\d|\bЗб\.|Записки|\bЕтн\.\s*Зб|Народ\.\s*пісн|\bстор\.)/u
const RU_APP = /[ъыэё]|(?:^|\s)(?:что|это|или|который|быть|были|также|только|если|когда)(?:\s|$)/i
export interface Rec { n: number; title: string; text: string; footer: Footer; page: number | null; line: number; date: number; dateBasis: string }
export interface SplitStats { byGazetteer: number; footers: number; placed: number; unplaced: number; gated: Record<string, number>; apparatus: number }

/** paragraphs (blank-line separated) that are the editors' notes, parallels or Polish/German/Russian apparatus */
function isApparatus(par: string): boolean {
  const p = par.trim()
  if (!p) return false
  if (NOTE_START.test(p)) return true
  if (NOTE_REF.test(p)) return true
  if (RU_APP.test(p)) return true
  const letters = (p.match(/\p{L}/gu) ?? []).length || 1
  return (p.match(/[A-Za-z]/g) ?? []).length / letters > 0.2
}

export function splitVolume(text: string, vol: { vol: string; year: number }): { records: Rec[]; stats: SplitStats } {
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim())
  const stats: SplitStats = { byGazetteer: 0, footers: 0, placed: 0, unplaced: 0, gated: {}, apparatus: 0 }
  // printed page number at each line: a stand-alone number that follows the previous page number by 1…4
  const pageAt: (number | null)[] = new Array(lines.length).fill(null)
  let cur: number | null = null
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\d{1,4})$/.exec(lines[i]!)
    if (m) { const n = +m[1]!; if (cur === null ? n >= 1 && n <= 40 : n > cur && n <= cur + 4) cur = n }
    pageAt[i] = cur
  }
  // regions the volume itself places by county (≥ 3 footers): the only regions a gazetteer village may resolve to
  const volRegions = new Set<string>(), cnt: Record<string, number> = {}
  for (let i = 0; i < lines.length; i++) if (FOOTER_START.test(lines[i]!)) { const f = parseFooter([lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(' '), vol.year); if (f && (cnt[f.region] = (cnt[f.region] ?? 0) + 1) >= 3) volRegions.add(f.region) }
  const records: Rec[] = []
  let prevEnd = -1, n = 0
  for (let i = 0; i < lines.length; i++) {
    if (!FOOTER_START.test(lines[i]!)) continue
    // the footer paragraph: up to 3 lines, to the first blank line
    let end = i; const parts = [lines[i]!]
    while (end + 1 < lines.length && end - i < 3 && lines[end + 1]) { end++; parts.push(lines[end]!) }
    stats.footers++
    const segStart = prevEnd + 1; prevEnd = end
    const foot = parseFooter(parts.join(' '), vol.year)
    if (!foot) { stats.unplaced++; continue }
    if (i - segStart > 1500) { stats.gated['overlong'] = (stats.gated['overlong'] ?? 0) + 1; continue }
    // the segment: drop apparatus paragraphs, cut after the last numbered heading
    const seg = lines.slice(segStart, i)
    const pars = seg.join('\n').split(/\n\s*\n/)
    const keep: string[] = []
    for (const p of pars) { if (isApparatus(p)) stats.apparatus++; else keep.push(p) }
    const kl = keep.join('\n\n').split('\n')
    let from = 0, title = ''
    for (let k = 0; k < kl.length; k++) if (/^\d{1,4}\s?[.,]\s+\p{L}/u.test(kl[k]!)) { from = k + 1; title = kl[k]!.replace(/^\d{1,4}\s?[.,]\s+/, '') }
    const body = kl.slice(from).join('\n').trim()
    if (!title) title = (body.split('\n')[0] ?? '').slice(0, 60)
    const g = oqGate(body)
    if (!g.ok) { stats.gated[g.reason!] = (stats.gated[g.reason!] ?? 0) + 1; continue }
    const stated = foot.year !== null
    records.push({ n: ++n, title: title.slice(0, 90), text: body, footer: foot, page: pageAt[i] ?? null, line: i + 1, date: stated ? foot.year! : vol.year, dateBasis: stated ? `recording year stated in the record footer: ${foot.year}` : `volume year ${vol.year} (recording year not stated in the footer)` })
    stats.placed++
  }
  return { records, stats }
}


const LIC = 'PD (видання 1895–1929, НТШ Львів; archive.org OCR, не вичитано; примітки й апарат редакторів не беруться)'
export const recordItem = (vol: Hv6Volume, r: Rec, editor: string | null, idx: number): IndexItem => ({
  id: `hv6:${vol.ia}:${r.n}`, url: `https://archive.org/details/${vol.ia}`, date: String(r.date), licence: LIC, bytes: Buffer.byteLength(r.text), status: 200,
  title: `${vol.series} т. ${vol.vol}${r.title ? ': ' + r.title : ''}`, ...(r.footer.collector ?? editor ? { author: r.footer.collector ?? editor! } : {}), region: r.footer.region, regionIso: r.footer.regionIso,
  county: r.footer.county, countyKind: r.footer.countyKind, village: r.footer.village, dateBasis: r.dateBasis, dateQuote: r.footer.quote, collectorBasis: r.footer.collector ? 'footer' : editor ? 'volume editor (collector not stated in the footer)' : 'not stated',
  volume: `${vol.series} т. ${vol.vol} (${vol.year})`, series: vol.series, vol: vol.vol, page: r.page, djvuLine: r.line, regionCite: `${vol.ia}_djvu.txt, ${r.page ? 'с. ' + r.page + ', ' : ''}рядок ${r.line}: «${r.footer.quote.slice(0, 160)}»`,
  ocr: true, idx, n: r.n,
})

/** archive.org ids already harvested whole-volume by the archive-* presets (they are superseded at ingest by the per-record witnesses) */
export function wholeVolumeIds(): Set<string> {
  const ids = new Set<string>()
  try { for (const d of readdirSync(ROOT_DIR)) if (d.startsWith('archive-')) { const p = `${ROOT_DIR}/${d}/index.jsonl`; if (existsSync(p)) for (const l of readFileSync(p, 'utf8').split('\n')) { const m = /"id":"([^"]+)"/.exec(l); if (m) ids.add(m[1]!) } } } catch { /* none */ }
  return ids
}

type SavedIndex = Record<string, { county: string; line: number; quote: string }[]>
const dehydrate = (i: VillageIndex): SavedIndex => Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v.map(x => ({ county: x.county.name, line: x.line, quote: x.quote }))]))
const rehydrate = (s: SavedIndex | VillageIndex): VillageIndex => Object.fromEntries(Object.entries(s ?? {}).map(([k, v]) => [k, v.map(x => ({ county: typeof x.county === 'string' ? PLACES.find(p => p.name === x.county)! : x.county, line: x.line, quote: x.quote }))]))

async function main() {
  decisionNeeded('- DECIDED (HV-6): ' + Object.entries(HV6_DUPES).map(([k, w]) => `${k}: ${w}`).join('; '))
  decisionNeeded('- NOT FOUND (HV-6): ' + HV6_MISSING.join('; '))
  const h = new Harvest('hv6', { delayMs: 2000, logEvery: 200 })
  const whole = wholeVolumeIds()
  for (const vol of HV6_VOLUMES) {
    const vid = `hv6v:${vol.ia}`
    if (h.has(vid)) continue
    const meta = await h.getJson<{ metadata?: Record<string, unknown>; files?: { name: string }[] }>(`https://archive.org/metadata/${vol.ia}`)
    const m = meta.metadata ?? {}, file = (meta.files ?? []).find(f => /_djvu\.txt$/.test(f.name))?.name
    const yearOk = String([].concat(m.date as never)[0] ?? '').startsWith(String(vol.year))
    const creators = ([] as string[]).concat((m.creator as string[] | string | undefined) ?? []).filter(c => /[А-ЯІЇЄҐа-яіїєґ]/.test(c))
    const editor = creators.find(c => /Гнатюк|Франко/.test(c))?.replace(/\s+Михайлович$/, '') ?? creators[0] ?? null
    if (!yearOk || !file) { h.log(`${vol.ia}: record mismatch (year ${yearOk}, text layer ${!!file}); not harvested`); h.put(`${vol.ia}.none`, '', [{ id: vid, url: `https://archive.org/details/${vol.ia}`, date: null, licence: LIC, bytes: 0, status: 0, title: vol.ia, type: 'volume', verified: `mismatch: ${m.date}` }]); continue }
    const { status, res } = await h.get(`https://archive.org/download/${vol.ia}/${encodeURIComponent(file)}`, { soft5xx: true })
    if (status !== 200) { h.put(`${vol.ia}.none`, '', [{ id: vid, url: `https://archive.org/details/${vol.ia}`, date: null, licence: LIC, bytes: 0, status, title: vol.ia, type: 'volume' }]); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    const text = buf.toString('utf8')
    let { records, stats } = splitVolume(text, vol)
    if (HV6_TAGGED.has(vol.ia)) {   // HV-6b: songs signed with a village; county from the index of places printed in т. 17 (kept in state.json for т. 18, 19)
      const st = h.state<{ index: SavedIndex }>({ index: {} })
      const own = parseVillageIndex(text), idx = mergeIndex(rehydrate(st.index), own)
      if (Object.keys(own).length) h.saveState({ ...st, index: dehydrate(idx) })
      const tg = splitTagged(text, idx, vol), base = records.length
      h.log(`${vol.ia}: village-signed songs: ${tg.stats.tagged} tagged, ${tg.stats.placed} placed in ${tg.stats.villages} villages, unresolved ${tg.stats.unresolved}, ambiguous ${tg.stats.ambiguous}`)
      records = [...records, ...tg.records.map(r => ({ ...r, n: base + r.n }))]
    }
    h.log(`${vol.ia} (${vol.series} т. ${vol.vol}, ${vol.year}): ${stats.footers} footers, ${stats.placed} placed records, ${stats.unplaced} unplaced, gated ${JSON.stringify(stats.gated)}, apparatus paragraphs ${stats.apparatus}`)
    const items: IndexItem[] = records.map((r, i) => recordItem(vol, r, editor, i))
    items.push({ id: vid, url: `https://archive.org/details/${vol.ia}`, date: String(vol.year), licence: LIC, bytes: buf.length, status: 200, title: `${vol.series} т. ${vol.vol} (${vol.year})`, type: 'volume', records: records.length, footers: stats.footers, unplaced: stats.unplaced, gated: stats.gated, tokens: records.reduce((a, r) => a + (r.text.match(/[p{L}]+/gu) ?? []).length, 0), supersedes: whole.has(vol.ia) ? vol.ia : null, verified: `archive.org metadata: «${String([].concat(m.title as never)[0] ?? '').slice(0, 80)}», ${m.date}` })
    h.put(vol.ia, JSON.stringify(records.map(r => r.text)), items)
  }
  h.finish()
}

/** the village a footer names without a county (candidates for the gazetteer build): «у Керестурі» → «Керестурі» */
export function footerVillages(text: string, volYear: number): string[] {
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()), out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!FOOTER_START.test(lines[i]!)) continue
    const t = flat([lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(' '))
    if (parseFooter(t, volYear)) continue
    const m = new RegExp(`(?:^|[\\s,])(?:в|у)\\s+([${CAP}][\\p{L}'’-]{2,})`, 'u').exec(t)
    if (m) out.push(m[1]!)
  }
  return out
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('harvest/hv6.ts')) await main()
