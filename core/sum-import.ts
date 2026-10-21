/**
 * SPEC 63 GG-7 — import of a LICENSED dump of СУМ-11 / СУМ-20 (nothing is crawled: sum20ua.com's robots.txt disallows AI crawlers, sum.in.ua was unreachable, GG-7).
 * Pure (no node imports). Input: one JSON object per line
 *   { head, stress?, pos?, vol?, page?, url?, senses: [{ n, labels?, gloss, full?, quote? }] }
 * `gloss` is the short gloss, `full` the full definition, `quote` an illustration. Without permission (flag FULL_SENSES_<DICT> off, the default) only the fields of the owner's
 * policy are kept: headword, stress, POS, sense numbers, labels, volume/page, link, a gloss of at most 200 characters; `full` and `quote` are DROPPED, never truncated into the row.
 */
import { GLOSS_MAX } from './se-parse.ts'
import { typeLabels, type SeRow } from './se.ts'

export const SUM_DICTS = ['sum11', 'sum20'] as const
export type SumDict = (typeof SUM_DICTS)[number]
/** the config flag of a dictionary: FULL_SENSES_SUM11, FULL_SENSES_SUM20 (default false; true only with written permission) */
export const fullSensesFlag = (d: SumDict): string => `FULL_SENSES_${d.toUpperCase()}`
export const fullSensesOn = (d: SumDict, env: Record<string, string | undefined>): boolean => /^(1|true|yes)$/i.test(env[fullSensesFlag(d)] ?? '')

export interface SumSenseIn { n?: number; labels?: string[]; gloss?: string; full?: string; quote?: string }
export interface SumArticleIn { head?: string; stress?: string; pos?: string; vol?: number | string; page?: number | string; url?: string; senses?: SumSenseIn[] }
export interface SumStats { lines: number; bad: number; articles: number; senses: number; clipped: number; droppedFull: number }

/** the label wording kept as printed (розм., заст., діал., перен., спец. …) */
const labelOk = (s: string): boolean => /^[\p{L}.\-’' ]{2,24}$/u.test(s)
const plain = (s: string): string => s.normalize('NFC').replace(/[́]/g, '').replace(/\s+/g, ' ').trim()
/** at most `max` characters, cut at a word boundary and marked with «…» */
export function clip(s: string, max = GLOSS_MAX): string {
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1), sp = cut.lastIndexOf(' ')
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:–-]+$/, '') + '…'
}
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
      if (!full) { if (s.full || s.quote) st.droppedFull++; if (g.length > GLOSS_MAX) { g = clip(g); st.clipped++ } }
      const t = typeLabels(`${g} ${lb.join(' ')}`)
      st.senses++
      const row: SeRow = { d: dict, g, ...(a.pos ? { p: plain(a.pos) } : {}), n: s.n || i + 1, ...(loc ? { l: loc } : {}), ...(url ? { u: url } : {}), ...(stress && stress !== head ? { a: stress } : {}), ...(lb.length ? { lb } : {}), ...(t.length ? { t } : {}), ...(full && s.quote ? { q: plain(s.quote) } : {}) }
      rows.push([head, row])
    })
  }
  return { rows, stats: st }
}
