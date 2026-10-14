/**
 * SPEC 63 MD — modern (2018–2026) colloquial, slang and IT vocabulary. Pure: no node or DOM imports.
 * Rows come from pipelines/ingest-modern.ts (public/data/modern.json); badges are COMPUTED from them, never hand-labelled (research/38).
 * Three dates are never confused: `crawl` (HPLT ts: page existed by then), `entry` (Wiktionary first revision: added to the dictionary), none (UberText dump).
 * Corpus witnesses are vocabulary-only: a counter and a date, never the text.
 */
import { claim, D, Q, type Claim, type Evidence } from './evidence.ts'
import { analyzeLoan, ROUTE_UK } from './loan-adapt.ts'
import { SOURCES } from './sources.ts'
import { key } from './text.ts'

/** registered here (not in core/sources.ts) so the corpus ids resolve wherever modern vocabulary is used */
export const MODERN_SOURCES = {
  HPLT: { title: 'HPLT 2.0 cleaned — веб-корпус (Internet Archive, Common Crawl), українська частина; лише лічильники', url: 'https://huggingface.co/datasets/HPLT/HPLT2.0_cleaned', license: 'CC0-1.0', year: '2025' },
  UBER: { title: 'UberText 2.0 (Chaplynskyi 2023, ACL UNLP), підкорпус social: публічні Telegram-канали; лише лічильники', url: 'https://lang.org.ua/en/ubertext/', year: '2023' },
}
Object.assign(SOURCES, MODERN_SOURCES)

export type ModernKind = 'slang' | 'it' | 'neologism'
export type ModernSrc = 'HPLT' | 'UBER' | 'WIKT'
export type DateKind = 'crawl' | 'entry'
/** one witness of a word: witnessType web | social | slang-dictionary (SPEC 63 MD-2) */
export interface ModernWitness {
  src: ModernSrc; witnessType: 'web' | 'social' | 'slang-dictionary'
  /** occurrences (corpora) or 1 (dictionary entry) */
  f: number
  /** earliest / latest known month YYYY-MM; absent = date unknown */
  first?: string; last?: string; dateKind?: DateKind
  /** locator: shard, category or entry URL */
  loc: string
  /** dictionary only: category (the label) and gloss ≤ 160 chars */
  cat?: string; gloss?: string
}
export interface ModernEntry {
  w: string
  kinds: ModernKind[]
  /** total frequency over corpora */
  f: number
  wit: ModernWitness[]
  /** earliest dated witness (month) and the kind of that date */
  first?: string; firstKind?: DateKind
  /** LA rule ids that fire on the word, route in Ukrainian */
  loan?: { ids: string[]; route: string; src: string }
  /** candidate (computed from counts) vs labelled by a dictionary category */
  candidate: boolean
}
export interface ModernSourceInfo { id: ModernSrc; title: string; url: string; licence: string; retrieved: string; stored: string; sample: string }
export interface ModernFile {
  format: 1; generated: string
  sources: ModernSourceInfo[]
  entries: ModernEntry[]
  /** MD-3 report: distinct words per source and per year (first-attestation year) */
  report: { perSource: Record<string, number>; perYear: Record<string, Record<string, number>>; candidates: number; labelled: number; docs: Record<string, number> }
}

export type ModernBadgeId = 'slang' | 'it' | 'neologism'
export const MODERN_UK: Record<ModernBadgeId, string> = { slang: 'сучасний сленг', it: 'ІТ-жаргон', neologism: 'неологізм' }
export const DATEKIND_UK: Record<DateKind, string> = { crawl: 'дата краулу веб-сторінки (не дата публікації)', entry: 'дата додавання статті до Вікісловника (не дата першого вжитку)' }
export interface ModernBadge { id: ModernBadgeId; text: string; first?: string; claim: Claim<string> }

/** thresholds of the candidate definition (MD-2) */
export const CAND_MIN_F = 3, CAND_MIN_SOURCES = 2

/** raw counts from pipelines/modern_count.py: token → source → [f, firstMonth, lastMonth] */
export type RawCounts = Record<string, Record<string, [number, string | null, string | null]>>
export interface WiktRow { w: string; kind: ModernKind; cat: string; gloss?: string; created: string; url: string }


/** the earliest dated witness decides the first attestation */
export function firstOf(wit: ModernWitness[]): { first?: string; kind?: DateKind } {
  let first: string | undefined, kind: DateKind | undefined
  for (const w of wit) if (w.first && (!first || w.first < first)) { first = w.first; kind = w.dateKind }
  return { first, kind }
}

/** LA typing: the cited suffix rules that fire on the token (no hand list); null when none fires */
export function loanTyping(word: string): ModernEntry['loan'] {
  const a = analyzeLoan(word)
  return a ? { ids: a.steps.map(s => s.id), route: ROUTE_UK[a.route], src: a.source } : undefined
}

export interface BuildInput { counts: RawCounts; wikt: WiktRow[]; shard: string; vesum?: (w: string) => boolean; maxCandidates?: number }
const WIT_TYPE: Record<string, ModernWitness['witnessType']> = { HPLT: 'web', UBER: 'social' }
const SHARD_LOC: Record<string, (s: string) => string> = { HPLT: s => `huggingface.co/datasets/HPLT/HPLT2.0_cleaned/${s}`, UBER: () => 'lang.org.ua/static/downloads/ubertext2.0/social/cleansed/ubertext.social…bz2' }

/** neologism candidates (absent from VESUM, f ≥ 3, ≥ 2 sources) + every dictionary-labelled word, each typed by LA and by its category */
export function buildModern(inp: BuildInput): ModernEntry[] {
  const out = new Map<string, ModernEntry>()
  const add = (w: string, wit: ModernWitness, kind: ModernKind | undefined, candidate: boolean) => {
    const k = key(w)
    const e = out.get(k) ?? { w: k, kinds: [], f: 0, wit: [], candidate }
    e.wit.push(wit); if (wit.src !== 'WIKT') e.f += wit.f
    if (kind && !e.kinds.includes(kind)) e.kinds.push(kind)
    if (!candidate) e.candidate = false
    out.set(k, e)
  }
  for (const [w, per] of Object.entries(inp.counts)) {
    const f = Object.values(per).reduce((s, x) => s + x[0], 0)
    if (f < CAND_MIN_F || Object.keys(per).length < CAND_MIN_SOURCES || inp.vesum?.(w)) continue
    for (const [src, [n, first, last]] of Object.entries(per)) add(w, { src: src as ModernSrc, witnessType: WIT_TYPE[src] ?? 'web', f: n, first: first ?? undefined, last: last ?? undefined, dateKind: first ? 'crawl' : undefined, loc: (SHARD_LOC[src] ?? (() => src))(inp.shard) }, 'neologism', true)
  }
  for (const r of inp.wikt) add(r.w, { src: 'WIKT', witnessType: 'slang-dictionary', f: 1, first: r.created.slice(0, 7), last: r.created.slice(0, 7), dateKind: 'entry', loc: r.url, cat: r.cat, gloss: r.gloss }, r.kind, false)
  let cand = [...out.values()].filter(e => e.candidate).sort((a, b) => b.f - a.f || a.w.localeCompare(b.w, 'uk'))
  const drop = new Set(cand.slice(inp.maxCandidates ?? 800).map(e => e.w))
  for (const e of out.values()) {
    if (drop.has(e.w)) { out.delete(e.w); continue }
    const { first, kind } = firstOf(e.wit); e.first = first; e.firstKind = kind
    const loan = loanTyping(e.w); if (loan) e.loan = loan
  }
  cand = [...out.values()]
  return cand.sort((a, b) => Number(a.candidate) - Number(b.candidate) || b.f - a.f || a.w.localeCompare(b.w, 'uk'))
}

/** evidence of one witness: dictionary → verbatim category + gloss quote; corpus → data record (counter + dates, no text) */
export function witnessEvidence(w: ModernWitness, f: ModernFile): Evidence {
  const s = f.sources.find(x => x.id === w.src)
  if (w.src === 'WIKT') return Q('WIKT', w.loc, w.gloss ? `${w.gloss} [Категорія:${w.cat}]` : `Категорія:${w.cat}`, `${DATEKIND_UK.entry}: ${w.first}; CC BY-SA 4.0`)
  const span = w.first ? `${w.first}${w.last && w.last !== w.first ? '…' + w.last : ''}` : 'дата не відома'
  return D(w.src, w.loc, `${w.f} уживань; ${span}${w.first ? ' (' + DATEKIND_UK.crawl + ')' : ''}`, `${s?.licence ?? ''}; зберігається лише словник: ${s?.stored ?? 'лічильник без тексту'}`)
}

/** badges of a word: «сучасний сленг» / «ІТ-жаргон» (dictionary category) and «неологізм (з YYYY)» (category or candidate), each a Claim with evidence and the first-attestation date */
export function modernBadges(word: string, f: ModernFile): ModernBadge[] {
  const e = f.entries.find(x => x.w === key(word))
  if (!e) return []
  const out: ModernBadge[] = []
  for (const kind of e.kinds) {
    const wit = e.wit.filter(w => (kind === 'neologism' ? w.src !== 'WIKT' || w.cat?.startsWith('Неологізми') : w.src === 'WIKT' && w.cat && (kind === 'it' ? /Інтернет|Комп/.test(w.cat) : w.cat.startsWith('Жаргонізми'))))
    if (!wit.length) continue
    const label = kind === 'neologism' ? `${MODERN_UK.neologism}${e.candidate ? ' (кандидат)' : ''}${e.first ? ' (з ' + e.first.slice(0, 4) + ')' : ''}` : MODERN_UK[kind]
    out.push({ id: kind, text: label, first: e.first, claim: claim(kind, wit.map(w => witnessEvidence(w, f)), { method: e.candidate ? `кандидат: немає у ВЕСУМ ∧ f ≥ ${CAND_MIN_F} ∧ ≥ ${CAND_MIN_SOURCES} джерел (MD-2); не перевірений неологізм` : 'категорія Вікісловника (MD-2)' }) })
  }
  return out
}

/** per-source / per-year report (MD-3) */
export function modernReport(entries: ModernEntry[], docs: Record<string, number>): ModernFile['report'] {
  const perSource: Record<string, number> = {}, perYear: Record<string, Record<string, number>> = {}
  for (const e of entries) for (const w of e.wit) {
    perSource[w.src] = (perSource[w.src] ?? 0) + 1
    const y = w.first ? w.first.slice(0, 4) : 'невідомо'
    ;(perYear[y] ??= {})[w.src] = (perYear[y]?.[w.src] ?? 0) + 1
  }
  return { perSource, perYear, candidates: entries.filter(e => e.candidate).length, labelled: entries.filter(e => !e.candidate).length, docs }
}
