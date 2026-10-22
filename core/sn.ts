/**
 * SPEC 63 CV-6 / SN-1 / SN-2. Pure (no node / DOM imports).
 *  - CV-6: the owner word list specs/user-words.txt (parse; priority r2u lookups; a listed word without a card is an error).
 *  - SN-1: every dictionary attestation line of a card is linked to the sense it documents; every sense carries its dating (first dictionary/witness + later ones).
 *    A line's sense is read from its quoted article start (locator «r2u <dict> · s?w=<q>#<dict>_<row>: <article start>»): in a ru→uk dictionary the Russian headword IS the meaning
 *    («Му́скулъ = мъя́сень» documents the sense «мускул» of мъя́сень); in a uk→ru dictionary the Russian gloss after the headword is («В'язь, -ли – мышца» → «мышца»). Lines with the same
 *    normalised gloss document one sense. Nothing is guessed: a line whose gloss cannot be read gets its own sense named by the quoted article start.
 *  - SN-2: the sense audit (counts and examples) over cards.
 */
import { key } from './text.ts'

// ── CV-6 ──────────────────────────────────────────────────────────────────────────────────────────
export interface UserWord { word: string; /** r2u lookups in the order given; scope 'both' = ukr and ru */ lookups: { q: string; scope: 'ukr' | 'ru' | 'both' }[]; source: string }
/** `word<TAB>lookup,lookup<TAB>source`; `#` lines are comments; a lookup may be prefixed `ukr:` / `ru:` (no prefix = both scopes). No lookups column = the word itself. */
export function parseUserWords(text: string): UserWord[] {
  const out: UserWord[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const [w = '', lk = '', source = ''] = line.split('\t').map(s => s.trim())
    if (!w) continue
    const lookups = (lk || w).split(',').map(s => s.trim()).filter(Boolean).map(s => {
      const m = /^(ukr|ru):(.*)$/.exec(s)
      return m ? { q: m[2]!.trim(), scope: m[1] as 'ukr' | 'ru' } : { q: s, scope: 'both' as const }
    })
    out.push({ word: w, lookups, source })
  }
  return out
}
/** The r2u queries of the list, deduplicated: the owner words themselves first (ukr scope), then the other lookups with both scopes expanded: [q, scope][]. */
export function priorityQueries(words: UserWord[]): [string, 'ukr' | 'ru'][] {
  const seen = new Set<string>(), out: [string, 'ukr' | 'ru'][] = []
  const add = (q: string, s: 'ukr' | 'ru') => { const k = q + '\0' + s; if (!seen.has(k)) { seen.add(k); out.push([q, s]) } }
  for (const w of words) add(w.word, 'ukr')
  for (const w of words) for (const l of w.lookups) { if (l.scope !== 'ru') add(l.q, 'ukr'); if (l.scope !== 'ukr') add(l.q, 'ru') }
  return out
}
/** CV-6 check: the listed words that have no card (`hasCard` is given the word). */
export const missingUserWords = (words: UserWord[], hasCard: (w: string) => boolean): string[] => words.filter(w => !hasCard(w.word)).map(w => w.word)

// ── SN-1 ──────────────────────────────────────────────────────────────────────────────────────────
/** [witness id, locator, attested spelling] — core/cv.ts CvAtt */
type Att = [w: string, loc: string, raw: string]
export interface SenseDate { w: string; from: number; to: number }
export interface AttSense { gloss: string; /** the earliest dictionary / witness that documents this sense */ first: SenseDate | null; /** later sources, oldest first */ later: SenseDate[]; /** indices of the attestation lines that document the sense */ lines: number[] }
export interface AttSenses { senses: AttSense[]; /** per attestation line (same order as the input): index into `senses` */ lineSense: number[] }
export type DictDir = 'ru-uk' | 'uk-ru' | 'uk-de' | 'orth'

const GRAM = /^(ж|м|с|мн|ч|гл|дієсл|прикм|присл|нар|прийм|спол|част|вигук|одн|множ|ср)\.?,?$/i
const SEP = /^[–—=:-]+$/
export const stripMarks = (s: string) => s.normalize('NFD').replace(/[\u0301\u0300]/g, '').normalize('NFC')
/** the article start quoted after the locator's «: » */
export const articleStart = (loc: string): string => { const i = loc.indexOf(': '); return i < 0 ? '' : loc.slice(i + 2).trim() }
/** The gloss a dictionary line documents, or undefined when the quoted start has none. `word` = the card word (its occurrences are removed from uk→ru articles). */
export function glossOf(loc: string, word: string, dir: DictDir | undefined): string | undefined {
  const t = stripMarks(articleStart(loc)).replace(/^\*+/, '').trim()
  if (!t) return undefined
  let g: string
  if (dir === 'ru-uk') {
    g = t.split(/\s[=–—]\s|\s:\s/)[0]!   // «Мускул = мъясень» → the Russian headword
  } else if (dir === 'uk-ru') {
    const toks = t.split(/\s+/), w = key(word); let i = 0
    while (i < toks.length) {
      const x = toks[i]!.replace(/[,.;]+$/, '')
      if (key(x) === w || /^-/.test(x) || GRAM.test(x) || SEP.test(x) || /^\d+[.)]?$/.test(x)) i++
      else if (i === 0) i++   // the headword in another spelling
      else break
    }
    g = toks.slice(i).join(' ')
  } else g = t
  g = g.replace(/\s*\(.*$/, '').replace(/(^|\s)Сл\.\s.*$/, '').split(/\.\s/)[0]!.replace(/[.;,\s]+$/, '').trim()
  return g.length >= 2 ? g.slice(0, 80) : undefined
}
const glossKey = (g: string) => key(g.split(/[,;]/)[0]!.trim())

/**
 * SN-1: group a card's attestation lines into senses and date them. `dateOf(w)` = [from, to] of the witness (dictionary edition years); `dirOf(w)` = the dictionary direction (undefined = unknown).
 * `first` is the source with the smallest (from, to); every other source of the sense is `later`.
 */
export function senseOfAtts(atts: Att[], word: string, dateOf: (w: string) => [number, number] | undefined, dirOf: (w: string) => DictDir | undefined = () => undefined): AttSenses {
  const senses: AttSense[] = [], by = new Map<string, number>(), lineSense: number[] = [], dated: SenseDate[][] = []
  atts.forEach((a, i) => {
    const g = glossOf(a[1], word, dirOf(a[0])) ?? (articleStart(a[1]).slice(0, 60) || a[2])
    const k = glossKey(g) || a[2]
    let n = by.get(k)
    if (n === undefined) { n = senses.length; by.set(k, n); senses.push({ gloss: g, first: null, later: [], lines: [] }); dated.push([]) }
    senses[n]!.lines.push(i); lineSense.push(n)
    const d = dateOf(a[0])
    if (d && !dated[n]!.some(x => x.w === a[0])) dated[n]!.push({ w: a[0], from: d[0], to: d[1] })
  })
  senses.forEach((s, n) => {
    const ds = dated[n]!.sort((a, b) => a.from - b.from || a.to - b.to)
    s.first = ds[0] ?? null; s.later = ds.slice(1)
  })
  return { senses, lineSense }
}
export const fmtYears = (d: Pick<SenseDate, 'from' | 'to'>): string => (d.from === d.to ? String(d.from) : `${d.from}–${d.to}`)

// ── SN-2 ──────────────────────────────────────────────────────────────────────────────────────────
export interface AuditCard { word: string; kind: 'full' | 'light' | 'cv' | 'archaic'; /** the word is a Plast headword */ plast: boolean; /** the card shows a Plast sense */ plastSense: boolean; /** dictionary attestation lines of the card */ dictLines: number; senses: AttSense[] }
export interface AuditResult {
  cards: number; plastCards: number; plastWithoutSense: string[]; dictCards: number; headwordsWithoutSense: string[]; senses: number; sensesWithoutDate: { word: string; gloss: string }[]; byKind: Record<string, number>
}
export function auditSenses(cards: Iterable<AuditCard>): AuditResult {
  const r: AuditResult = { cards: 0, plastCards: 0, plastWithoutSense: [], dictCards: 0, headwordsWithoutSense: [], senses: 0, sensesWithoutDate: [], byKind: {} }
  for (const c of cards) {
    r.cards++; r.byKind[c.kind] = (r.byKind[c.kind] ?? 0) + 1
    if (c.plast) { r.plastCards++; if (!c.plastSense) r.plastWithoutSense.push(c.word) }
    if (c.dictLines) { r.dictCards++; if (!c.senses.length) r.headwordsWithoutSense.push(c.word) }
    for (const s of c.senses) { r.senses++; if (!s.first) r.sensesWithoutDate.push({ word: c.word, gloss: s.gloss }) }
  }
  return r
}
const ex = (a: string[], n = 15) => a.slice(0, n).map(x => `\`${x}\``).join(', ') + (a.length > n ? ` … (+${a.length - n})` : '')
export function auditMarkdown(r: AuditResult, generated: string): string {
  return [
    '# Sense audit (SPEC 63 SN-2)', '', `Generated ${generated} by \`npm run audit:senses\` (pipelines/sense-audit.ts); do not edit.`, '',
    `- Cards audited: ${r.cards} (${Object.entries(r.byKind).map(([k, n]) => `${k} ${n}`).join(', ')})`,
    `- Plast cards: ${r.plastCards}; **without a Plast sense: ${r.plastWithoutSense.length}** (the build test fails if this is not 0)`,
    `- Cards with dictionary attestation lines: ${r.dictCards}; **without any sense: ${r.headwordsWithoutSense.length}**`,
    `- Senses: ${r.senses}; **without a date: ${r.sensesWithoutDate.length}**`, '',
    '## Plast cards without a Plast sense', r.plastWithoutSense.length ? ex(r.plastWithoutSense) : 'none', '',
    '## Dictionary headwords whose gloss did not become a sense', r.headwordsWithoutSense.length ? ex(r.headwordsWithoutSense) : 'none', '',
    '## Senses without a date', r.sensesWithoutDate.length ? ex(r.sensesWithoutDate.map(s => `${s.word}: ${s.gloss}`)) : 'none', '',
  ].join('\n')
}
