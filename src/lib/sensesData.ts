/** BL-9: lazy, cached loader for public/data/senses.json (uk.wiktionary senses, CC BY-SA 4.0) and a reactive lemma → senses lookup (empty until the file arrives or when it is absent). */
import type { Sense, SensesFile } from '../../core/senses.ts'
import { lmPeek } from './parts.ts'

/** Senses of a lemma: the lm/senses/<bucket>.json shard of its bucket (SPEC 63 PF-1), reactive; [] while loading or when there are none. */
export function sensesOf(lemma: string): Sense[] {
  return lmPeek<SensesFile>('senses', lemma)?.[lemma] ?? []
}

/** Group senses by stressed spelling, in page order; senses without a stress go to the group `''`. */
export function groupByStress(rows: Sense[]): { stress: string; senses: Sense[] }[] {
  const by = new Map<string, Sense[]>()
  for (const s of rows) { const k = s.stress ?? ''; (by.get(k) ?? (by.set(k, []), by.get(k)!)).push(s) }
  return [...by].map(([stress, senses]) => ({ stress, senses }))
}
/** One-line summary of the «Значення» panel: the first gloss (shortened) and the number of senses. */
export function sensesSummary(rows: Sense[]): string {
  if (!rows.length) return ''
  const g = rows[0]!.gloss, short = g.length > 90 ? g.slice(0, 88).replace(/\s+\S*$/, '') + '…' : g
  return rows.length > 1 ? `${short} · значень: ${rows.length}` : short
}
export const wiktUrl = (lemma: string, rev?: string) => `https://uk.wiktionary.org/w/index.php?title=${encodeURIComponent(lemma)}${rev ? '&oldid=' + rev : ''}`
export const SENSES_LICENCE = 'Вікісловник (uk.wiktionary.org), CC BY-SA 4.0'
