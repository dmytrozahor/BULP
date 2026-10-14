/**
 * BL-15 cross-Slavic counterparts (research/28). Pure: no node or DOM imports.
 *
 * > "Pivot = the Proto-Slavic entry … the `descendants` tree … the only licensed, machine-readable, already-aligned cognate set." — research/28 §0
 * > "Only F2/F3 outputs are phrased as «у джерелах, які ми переглянули, перша фіксація … пізніша»; … absence … is not evidence of absence." — research/28 §3.2
 * Dates come from Wiktionary etymology text («First attested in 1496») or a tree tag («19th cent.»): editor-added, unsourced → D-evidence quoting the wiktionary text, never more.
 * The ET-3 flag is a REVIEW PROMPT: interval logic only (ours.to < theirs.from), vernacular Ukrainian attestations only, copy date of the witness, never «Ukrainian is older».
 */
import { D, type Evidence } from './evidence.ts'

export type CogLang = 'pl' | 'be' | 'ru' | 'zlw-opl' | 'zle-ort' | 'orv'
export const COG_LANGS: CogLang[] = ['pl', 'zlw-opl', 'be', 'zle-ort', 'ru', 'orv']
export const COG_LANG_UK: Record<CogLang, string> = { pl: 'польська', 'zlw-opl': 'староп.', be: 'білоруська', 'zle-ort': 'староукр./рус.', ru: 'російська', orv: 'давньорус.' }
export const COG_LANG_EN: Record<CogLang, string> = { pl: 'Polish', 'zlw-opl': 'Old Polish', be: 'Belarusian', 'zle-ort': 'Old Ruthenian', ru: 'Russian', orv: 'Old East Slavic' }
export interface CogRow {
  l: CogLang; w: string
  /** the tree marks it as borrowed (below the Ukrainian node = from Ukrainian): excluded from the antedating comparison */
  b?: 1
  /** SPEC 63 GZ-5: same etymon, another word: a borrowing/doublet whose own Wiktionary gloss differs from the Proto-Slavic one (ksiądz «priest» ≠ князь «prince»); listed apart, never as a correspondence */
  o?: 1; g?: string
  /** earliest dating interval [from,to] the source gives, with the verbatim clause and where it came from */
  d?: [number, number]; q?: string; k?: 'etym' | 'tree'
}
export type CogFlagCode = 'uk-antedates-donor' | 'uk-antedates-cognates'
export interface CogFlag { code: CogFlagCode; ours: [number, number]; theirs: [number, number]; langs: CogLang[]; eastSlavic: boolean; note: string }
export interface CognateEntry { pivot: string; gloss?: string; rows: CogRow[]; evidence: Evidence[]; flag?: CogFlag }
export interface CognateFile {
  format: 1; generated: string
  attribution: { wiktionary: string; licence: string; files: { file: string; url: string; bytes: number; sha256: string; date: string }[] }
  entries: Record<string, CognateEntry>
}

export const stripAccent = (s: string) => s.normalize('NFD').replace(/́/g, '').normalize('NFC').toLowerCase()
export const wiktPsl = (pivot: string) => `https://en.wiktionary.org/wiki/Reconstruction:Proto-Slavic/${encodeURIComponent(pivot.replace(/^\*/, ''))}`
export const cogEvidence = (pivot: string, quote: string, extracted: string): Evidence =>
  D('KAIKKI', wiktPsl(pivot), quote.slice(0, 300), `Wiktionary (en), CC BY-SA 4.0, дерево нащадків Proto-Slavic; витяг Wiktextract/kaikki.org ${extracted}`)

// ── dating of a cognate ───────────────────────────────────────────────────────────────────────────
const NUM = '(\\d{3,4})(?:\\s*[‒–\\-]\\s*(\\d{3,4}))?'
const ATT_YEAR = new RegExp(`\\battested\\s+(?:in|since|from|by|circa|around|ca\\.|c\\.)?\\s*(?:the\\s+)?(?:year\\s+)?(?:c\\.\\s*|ca\\.\\s*|circa\\s+)?${NUM}`, 'i')
const ATT_CENT = /\battested\s+(?:in|since|from|by)\s+(?:the\s+)?(?:early\s+|late\s+|mid-?\s*)?(\d{1,2})(?:st|nd|rd|th)[ -](?:century|c\.)/i
const OTHER_LANG = /^(Compare|Cognates?|Doublet|Related|Akin|See also|Displaced|Possibly cognate)\b/i
const YR = (n: number) => n >= 800 && n <= 2030
/** «First attested in c. 1056‒1057» → [1056,1057]; «in the 14th century» → [1301,1400]. Sentences that talk about other languages («Compare …») are rejected (research/28 §3.3.6). */
export function cognateDating(text: string): { from: number; to: number; quote: string } | undefined {
  for (const s of text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z])/)) {
    if (OTHER_LANG.test(s.trim())) continue
    const y = ATT_YEAR.exec(s)
    if (y && YR(+y[1]!)) { const a = +y[1]!; const b = y[2] ? (+y[2]! < 100 ? Math.floor(a / 100) * 100 + +y[2]! : +y[2]!) : a; if (YR(b) && b >= a) return { from: a, to: b, quote: y[0].trim() } }
    const c = ATT_CENT.exec(s)
    if (c) { const n = +c[1]!; return { from: 100 * (n - 1) + 1, to: 100 * n, quote: c[0].trim() } }
  }
  return undefined
}
/** tree tag like «19ᵗʰ cent.» */
export function treeTagDating(tags: string[] | undefined): { from: number; to: number; quote: string } | undefined {
  for (const t of tags ?? []) { const m = /^(\d{1,2})\D{0,4}\s*cent/i.exec(t); if (m) { const n = +m[1]!; return { from: 100 * (n - 1) + 1, to: 100 * n, quote: t } } }
  return undefined
}

// ── ET-3 flag (BL-15) ─────────────────────────────────────────────────────────────────────────────
const span = (a: [number, number]) => (a[0] === a[1] ? String(a[0]) : a.join('–'))
const EAST_WORDING = /East Slavic|Old Rus|праслов|Proto-Slavic/i
const EAST_SLAVIC_LANG: ReadonlySet<CogLang> = new Set<CogLang>(['orv', 'zle-ort'])
export interface VernInput { ours: [number, number]; vernacular: boolean }
/**
 * `donor`: the language the Ukrainian etymology (Wiktionary chain «Borrowed from Polish …») names as source, if any.
 * antedates-donor  : donor dated and ours.to < donor.from  → either a source gap or a wrong direction/time.
 * antedates-cognates: ≥ 1 dated non-Ukrainian-derived counterpart and ours.to < every such counterpart's from (information, no direction claimed).
 * Church-Slavonic-layer attestations (vernacular=false) never fire (research/28 §3.3.3). Before ~1300 the claim is East Slavic, not Ukrainian (P-2.4).
 */
export function cognateFlag(v: VernInput, rows: CogRow[], donor?: CogLang): CogFlag | undefined {
  if (!v.vernacular) return undefined
  // BL-15b: a dating whose own wording is East Slavic / Proto-Slavic already covers the Old Rus' period — it is no Ukrainian-specific claim to antedate
  const dated = rows.filter(r => r.d && !r.b && !r.o && !EAST_WORDING.test(r.q ?? ''))
  if (!dated.length) return undefined
  const east = v.ours[1] < 1300
  const pre = east ? 'давньоруська (східнослов’янська) фіксація' : 'українська (рутенська) фіксація'
  const pick = (rs: CogRow[]) => ({ from: Math.min(...rs.map(r => r.d![0])), to: Math.min(...rs.map(r => r.d![1])) })
  // BL-15b: before ~1300 only a dated Polish-type donor claim can be antedated; cognate-set flags (338 of 343 at first build) carry no information and are not emitted
  const d = donor && !EAST_SLAVIC_LANG.has(donor) ? dated.filter(r => r.l === donor) : []
  if (d.length) {
    const t = pick(d)
    if (v.ours[1] < t.from) return { code: 'uk-antedates-donor', ours: v.ours, theirs: [t.from, t.to], langs: [donor!], eastSlavic: east, note: `${pre} (${span(v.ours)}) раніша за датування джерела запозичення — ${COG_LANG_UK[donor!]} (${span([t.from, t.to])}): або джерело датування неповне, або напрям/час запозичення варто перевірити` }
  }
  if (east) return undefined
  const t = pick(dated)
  if (v.ours[1] < t.from) {
    const langs = [...new Set(dated.map(r => r.l))]
    return { code: 'uk-antedates-cognates', ours: v.ours, theirs: [t.from, Math.max(...dated.map(r => r.d![1]))], langs, eastSlavic: east, note: `${pre} (${span(v.ours)}) раніша за всі датовані відповідники (від ${t.from}): у переглянутих джерелах перша фіксація відповідників пізніша — це не доводить первинності` }
  }
  return undefined
}
export const FLAG_UK: Record<CogFlagCode, string> = {
  'uk-antedates-donor': 'українська фіксація давніша за датування джерела запозичення — перевірити',
  'uk-antedates-cognates': 'українська фіксація давніша за датування відповідників — перевірити',
}

/**
 * SPEC 63 GZ-5: is a descendant row another WORD of the same etymon (borrowing / doublet with a different meaning) rather than the same word in a cousin language?
 * Evidence, all from Wiktionary: the row's own etymology says «Borrowed from» / «Doublet of» AND its first gloss shares no content word with the Proto-Slavic gloss.
 * Without a gloss nothing is claimed (the row stays a correspondence).
 */
const WORDS = (s: string) => (s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(w => !['with', 'from', 'that', 'this', 'title', 'used', 'form', 'part'].includes(w))
export function otherWord(rowGloss: string | undefined, pslGloss: string | undefined, etym: string | undefined): boolean {
  if (!rowGloss || !pslGloss || !etym) return false
  if (!/(Borrowed from|Doublet of)/.test(etym)) return false
  const a = WORDS(pslGloss), b = WORDS(rowGloss)
  return a.length > 0 && !a.some(w => b.some(x => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5))))
}
