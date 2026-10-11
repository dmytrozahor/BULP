/**
 * Search keys. SPEC 00 goal: find a lemma by any of its historical spellings or paradigm forms.
 * > "Search key: NFC, no stress, lower case, one apostrophe." — core/text.ts key()
 * Old letters ѣ ъ ы ѧ are indexed as written AND via stage-N normalisation, so the user may type either.
 */
import type { LemmaCard, VesumHit } from '../../core/types.ts'
import { key, normalizeOld } from '../../core/text.ts'

export type Via = 'lemma' | 'form' | 'paradigm'
export interface Hit { lemma: string; form: string; via: Via }
export interface SearchIndex { map: Map<string, Hit[]>; keys: string[] }
export interface Result { lemma: string; matched: string; via: Via; rank: number }

const VIA_RANK: Record<Via, number> = { lemma: 0, form: 1, paradigm: 2 }

export function buildIndex(cards: LemmaCard[]): SearchIndex {
  const map = new Map<string, Hit[]>()
  const add = (form: string, lemma: string, via: Via) => {
    const k = key(form); if (!k) return
    const list = map.get(k) ?? []; if (!list.some(h => h.lemma === lemma)) list.push({ lemma, form, via }); map.set(k, list)
  }
  for (const c of cards) {
    add(c.lemma, c.lemma, 'lemma')
    for (const f of c.forms) { add(f.raw, c.lemma, 'form'); add(f.norm, c.lemma, 'form'); add(f.modern, c.lemma, 'form') }
    for (const p of c.paradigm) add(p.form, c.lemma, 'paradigm')
  }
  return { map, keys: [...map.keys()].sort() }
}

/** The query variants: as typed, and with Old-Cyrillic letters normalised (титла/ѣ-variants collapse). */
export const queryKeys = (q: string) => [...new Set([key(q.trim()), key(normalizeOld(q.trim()).norm)])].filter(Boolean)

const lowerBound = (a: string[], x: string) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; a[m]! < x ? (lo = m + 1) : (hi = m) } return lo }

export function search(idx: SearchIndex, q: string, limit = 30): Result[] {
  const best = new Map<string, Result>()
  const put = (k: string, h: Hit, tier: number) => {
    const rank = tier * 10 + VIA_RANK[h.via], cur = best.get(h.lemma)
    if (!cur || rank < cur.rank) best.set(h.lemma, { lemma: h.lemma, matched: h.form, via: h.via, rank })
  }
  for (const qk of queryKeys(q)) {
    for (const h of idx.map.get(qk) ?? []) put(qk, h, 0)
    for (let i = lowerBound(idx.keys, qk); i < idx.keys.length && idx.keys[i]!.startsWith(qk) && best.size < limit * 4; i++)
      for (const h of idx.map.get(idx.keys[i]!)!) put(idx.keys[i]!, h, 1)
    if (best.size < limit && qk.length >= 3)
      for (const k of idx.keys) if (k.includes(qk) && !k.startsWith(qk)) { for (const h of idx.map.get(k)!) put(k, h, 2); if (best.size >= limit * 2) break }
  }
  return [...best.values()].sort((a, b) => a.rank - b.rank || a.lemma.localeCompare(b.lemma, 'uk')).slice(0, limit)
}

export const emptyIndex = (): SearchIndex => ({ map: new Map(), keys: [] })

/**
 * F2: the same index + the VESUM paradigm map in ONE pass, time-sliced (a 15 MB lexicon takes ~1 s of CPU; slices of ≤ 25 ms keep the page responsive
 * and let a progress bar paint). Chosen over a Web Worker because the annotator/analyser read the Maps synchronously and structured-cloning
 * multi-million-entry Maps back costs more than building them.
 */
export async function buildIndexAsync(cards: LemmaCard[], onProgress?: (f: number) => void, sliceMs = 25): Promise<{ idx: SearchIndex; paradigm: Map<string, VesumHit[]> }> {
  const map = new Map<string, Hit[]>(), paradigm = new Map<string, VesumHit[]>()
  const add = (form: string, lemma: string, via: Via) => {
    const k = key(form); if (!k) return
    const list = map.get(k) ?? []; if (!list.some(h => h.lemma === lemma)) list.push({ lemma, form, via }); map.set(k, list)
  }
  let t0 = performance.now()
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]!
    add(c.lemma, c.lemma, 'lemma')
    for (const f of c.forms) { add(f.raw, c.lemma, 'form'); add(f.norm, c.lemma, 'form'); add(f.modern, c.lemma, 'form') }
    for (const p of c.paradigm) { add(p.form, c.lemma, 'paradigm'); const k = key(p.form); if (k) { const l = paradigm.get(k); l ? l.push({ lemma: c.lemma, tags: p.tags }) : paradigm.set(k, [{ lemma: c.lemma, tags: p.tags }]) } }
    if (performance.now() - t0 > sliceMs) { onProgress?.(i / cards.length); await new Promise<void>(r => setTimeout(r, 0)); t0 = performance.now() }
  }
  const keys = [...map.keys()].sort()
  onProgress?.(1)
  return { idx: { map, keys }, paradigm }
}
