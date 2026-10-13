/** BL-9: lazy, cached loader for public/data/senses.json (uk.wiktionary senses, CC BY-SA 4.0) and a reactive lemma → senses lookup (empty until the file arrives or when it is absent). */
import { shallowRef } from 'vue'
import type { Sense, SensesFile } from '../../core/senses.ts'

const file = shallowRef<SensesFile>()
let started = false
export function loadSenses(): void {
  if (started) return
  started = true
  fetch('./data/senses.json').then(r => (r.ok ? r.json() : undefined)).then(j => { if (j && typeof j === 'object') file.value = j as SensesFile }).catch(() => { /* optional data */ })
}
/** Senses of a lemma (reactive through `file`). */
export function sensesOf(lemma: string): Sense[] {
  loadSenses()
  return file.value?.[lemma] ?? []
}
export const sensesLoaded = file

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
