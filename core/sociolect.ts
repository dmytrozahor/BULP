/**
 * SPEC 63 SL — sociolects (Plast), loanword/abbreviation processes, literary-language status. Pure: no node or DOM imports.
 * Labels are COMPUTED from ingested rows (pipelines/ingest-plast.ts → public/data/sociolect.json); nothing is hand-labelled here.
 * Plast entries are cite-only (the source is copyrighted): headword + a short quoted gloss + locator, never the full text.
 */
import { claim, D, Q, type Claim } from './evidence.ts'
import { key } from './text.ts'

/** a Plast entry: w headword, g gloss (≤ 1 sentence, quoted), k 'term' (glossary part) | 'abbr' (abbreviation part), loc locator */
export interface PlastEntry { w: string; g: string; k: 'term' | 'abbr'; loc: string }
/** a documented process of a word: kind 'abbreviation' | 'anglicism' | 'jargon'; every row has a source, a verbatim quote and a locator */
export interface ProcessRow { w: string; kind: 'abbreviation' | 'anglicism' | 'jargon'; source: string; loc: string; quote: string; note?: string }
export interface LiteraryRow { w: string; vesum: string | null }
export interface SociolectFile {
  format: 1; generated: string
  plast: { source: string; url: string; retrieved: string; licence: string; compiler: string; entries: PlastEntry[] }
  processes: ProcessRow[]
  /** VESUM lookup per checked word (tag line of the lemma line, or null = absent); СУМ-11/СУМ-20 not reachable from the build host — see research/33 */
  literary: LiteraryRow[]
}

export type SocBadgeId = 'plast' | 'zharhon' | 'anglicism' | 'abbreviation'
export const SOC_UK: Record<SocBadgeId, string> = { plast: 'пластова лексика', zharhon: 'жаргон', anglicism: 'англіцизм', abbreviation: 'абревіатура' }
export interface SocBadge { id: SocBadgeId; text: string; claim: Claim<string> }
export const DIALECT_UNKNOWN = 'діалектна належність не встановлена'

/** Plast glossary lines look like «Ватра – церемоніальне вогнище, …» (terms) or «ВПР/VPR: Відкриття пластового року» (abbreviations). */
export function parsePlastLines(lines: string[]): PlastEntry[] {
  const out: PlastEntry[] = []
  let part: 'term' | 'abbr' = 'term', n = 0
  for (const raw of lines) {
    const line = raw.trim(); n++
    if (!line) continue
    const abbr = /^([A-ZА-ЯІЇЄҐ’'0-9][A-Za-zА-Яа-яІіЇїЄєҐґ’'0-9.]*)(?:\/[^:\s]+)*:\s+(.+)$/.exec(line)
    if (abbr && /^[А-ЯІЇЄҐA-Z0-9]{2,}/.test(abbr[1]!) && abbr[1] === abbr[1]!.toUpperCase()) { part = 'abbr'; out.push({ w: abbr[1]!.replace(/\.[A-Za-z].*$/, ''), g: cut(abbr[2]!), k: 'abbr', loc: `абревіатури, рядок ${n}` }); continue }
    if (part === 'abbr') continue
    const flat = line.replace(/\s*\([^)]*\)/g, ''), i = flat.indexOf(' – ')
    if (i < 0) continue
    const head = flat.slice(0, i).replace(/\s+чи\s+.*$/, '').trim()
    if (head.split(' ').length > 3 || !/^[А-ЯІЇЄҐA-Za-zа-яіїєґ’'-]+( [А-Яа-яІіЇїЄєҐґ’'-]+){0,2}$/.test(head)) continue
    out.push({ w: head, g: cut(flat.slice(i + 3)), k: 'term', loc: `словник, рядок ${n}` })
  }
  return out
}
/** ≤ 1 sentence and ≤ 160 chars: cite-only */
const cut = (g: string) => { const s = /^.*?(?<!(?:^|\s)[а-яіїєґ]{1,3})[.!?](?=\s|$)/.exec(g)?.[0] ?? g; return s.length > 160 ? s.slice(0, 159).trimEnd() + '…' : s }

/** Entries of one word (case/stress-insensitive; Plast headwords carry stress capitals, so `key` lower-cases and strips). */
export const plastOf = (word: string, f: SociolectFile) => f.plast.entries.filter(e => key(e.w) === key(word))

/** Badges of a word, each a Claim whose evidence is the ingested quote (clickable to /source/:id through the evidence list). */
export function sociolectBadges(word: string, f: SociolectFile): SocBadge[] {
  const out: SocBadge[] = []
  const pl = plastOf(word, f)
  if (pl.length) out.push({ id: 'plast', text: SOC_UK.plast, claim: claim('plast', pl.map(e => D(f.plast.source, e.loc, e.g, `${f.plast.compiler}; ${f.plast.licence}`)), { method: 'ingest-plast: запис у пластовому словнику (лише цитата)' }) })
  if (pl.some(e => e.k === 'abbr')) out.push({ id: 'abbreviation', text: SOC_UK.abbreviation, claim: claim('abbreviation', pl.filter(e => e.k === 'abbr').map(e => D(f.plast.source, e.loc, e.g)), { method: 'розділ «абревіатури» пластового словника' }) })
  for (const kind of ['jargon', 'anglicism', 'abbreviation'] as const) {
    const rows = f.processes.filter(r => key(r.w) === key(word) && r.kind === kind)
    if (!rows.length) continue
    const id: SocBadgeId = kind === 'jargon' ? 'zharhon' : kind
    if (out.some(b => b.id === id)) continue
    out.push({ id, text: SOC_UK[id], claim: claim(id, rows.map(r => Q(r.source, r.loc, r.quote, r.note)), { method: 'ingest-plast: оброблені рядки процесів із цитатою' }) })
  }
  return out
}

/** Literary-language status from VESUM: present (the tag line) or absent; null when the word was not checked. */
export function literaryStatus(word: string, f: SociolectFile): { status: 'present' | 'absent'; tags?: string } | null {
  const r = f.literary.find(x => key(x.w) === key(word))
  return r ? (r.vesum ? { status: 'present', tags: r.vesum } : { status: 'absent' }) : null
}
