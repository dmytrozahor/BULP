/**
 * SPEC 63 GG-7 — import of a LICENSED dump of СУМ-11 / СУМ-20 (nothing is crawled: sum20ua.com's robots.txt disallows AI crawlers, sum.in.ua was unreachable, GG-7).
 * Pure (no node imports). Input: one JSON object per line
 *   { head, stress?, pos?, vol?, page?, url?, senses: [{ n, labels?, gloss, full?, quote? }] }
 * `gloss` is the short gloss, `full` the full definition, `quote` an illustration. Without permission (flag FULL_SENSES_<DICT> off, the default) only the fields of the owner's
 * policy are kept: headword, stress, POS, sense numbers, labels, volume/page, link, a gloss of at most 200 characters; `full` and `quote` are DROPPED, never truncated into the row.
 */
import { clipTo, isFullText, maxChars, SIZE_BUDGET } from './rights.ts'
import { typeLabels, type SeRow } from './se.ts'

export const SUM_DICTS = ['sum11', 'sum20'] as const
export type SumDict = (typeof SUM_DICTS)[number]
/** RG-1: the full definition and the quotation are kept only when core/rights.ts holds a `granted` entry of the dictionary without a character cap (written permission). The former FULL_SENSES_<DICT> environment flags are gone: one registry, one switch. */
export const fullSensesOn = (d: SumDict): boolean => isFullText(d)

export interface SumSenseIn { n?: number; labels?: string[]; gloss?: string; full?: string; quote?: string }
export interface SumArticleIn { head?: string; stress?: string; pos?: string; vol?: number | string; page?: number | string; url?: string; senses?: SumSenseIn[] }
export interface SumStats { lines: number; bad: number; articles: number; senses: number; clipped: number; droppedFull: number }

/** the label wording kept as printed (розм., заст., діал., перен., спец. …) */
const labelOk = (s: string): boolean => /^[\p{L}.\-’' ]{2,24}$/u.test(s)
const plain = (s: string): string => s.normalize('NFC').replace(/[́]/g, '').replace(/\s+/g, ' ').trim()
/** at most `max` characters, cut at a word boundary and marked with «…» */
export function clip(s: string, max = SIZE_BUDGET): string { return clipTo(s, max) }   // RG-1: the algorithm lives in core/rights.ts
/** the official site only: a link elsewhere is dropped */
export const officialUrl = (d: SumDict, u: string | undefined): string | undefined => {
  if (!u) return undefined
  const host = d === 'sum11' ? /^https:\/\/(?:www\.)?sum\.in\.ua\//i : /^https:\/\/(?:www\.)?sum20ua\.com\//i
  return host.test(u) ? u : undefined
}

export function importSum(dict: SumDict, jsonl: string, full = false): { rows: [string, SeRow][]; stats: SumStats } {
  const rows: [string, SeRow][] = [], st: SumStats = { lines: 0, bad: 0, articles: 0, senses: 0, clipped: 0, droppedFull: 0 }
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue
    st.lines++
    let a: SumArticleIn; try { a = JSON.parse(line) } catch { st.bad++; continue }   // a torn line is skipped
    const head = plain(a.head ?? '').toLowerCase()
    if (!head || !Array.isArray(a.senses) || !a.senses.length) { st.bad++; continue }
    st.articles++
    const url = officialUrl(dict, a.url), loc = [a.vol ? `т.${a.vol}` : '', a.page ? `с.${a.page}` : ''].filter(Boolean).join(' ')
    const stress = a.stress ? a.stress.normalize('NFC').trim() : ''
    a.senses.forEach((s, i) => {
      const lb = (s.labels ?? []).map(plain).filter(labelOk)
      let g = plain(full && s.full ? s.full : s.gloss ?? '')
      if (!full) { if (s.full || s.quote) st.droppedFull++; if (g.length > maxChars(dict)) { g = clipTo(g, maxChars(dict)); st.clipped++ } }
      const t = typeLabels(`${g} ${lb.join(' ')}`)
      st.senses++
      const row: SeRow = { d: dict, g, ...(a.pos ? { p: plain(a.pos) } : {}), n: s.n || i + 1, ...(loc ? { l: loc } : {}), ...(url ? { u: url } : {}), ...(stress && stress !== head ? { a: stress } : {}), ...(lb.length ? { lb } : {}), ...(t.length ? { t } : {}), ...(full && s.quote ? { q: plain(s.quote) } : {}) }
      rows.push([head, row])
    })
  }
  return { rows, stats: st }
}
