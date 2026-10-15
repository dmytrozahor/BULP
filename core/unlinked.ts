/**
 * SPEC 63 NV-3: index of UNLINKED spellings — word tokens that occur in a running text (public/data/texts) but are not a spelling of any lexicon lemma.
 * Without it /f/<spelling> (reached from the analyser or a shared URL) said «такого написання немає в корпусі» although the spelling is in a text.
 * Layout: public/data/unlinked/<n>.json = { "<key>": [raw, count, nWitnesses, w1, i1, w2, i2, w3, i3] } sharded by a stable hash of the key;
 * (w, i) = witness id + token index in public/data/texts/<w>.json (the KWIC is cut from there, no text is duplicated). At most 3 witnesses per spelling.
 */
import { key } from './text.ts'

export const UNLINKED_SHARDS = 64
export const UNLINKED_MAX_WITNESSES = 3
/** size budget of the whole directory, checked by the build and by tests/unlinked.test.ts */
export const UNLINKED_BUDGET_BYTES = 16 * 1024 * 1024

export const unlinkedShard = (k: string, n = UNLINKED_SHARDS): number => {
  let h = 2166136261
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h % n
}
/** a token worth a spelling page: letters (with stress / apostrophes / hyphen), no digits or punctuation-only tokens */
export const isWordToken = (raw: string): boolean => /\p{L}/u.test(raw) && /^[\p{L}\p{M}'’ʼ-]+$/u.test(raw)

export type UnlinkedEntry = [raw: string, count: number, nWitnesses: number, ...occ: (string | number)[]]
export interface UnlinkedOcc { w: string; i: number }
export const occurrencesOf = (e: UnlinkedEntry): UnlinkedOcc[] => {
  const out: UnlinkedOcc[] = []
  for (let j = 3; j + 1 < e.length; j += 2) out.push({ w: String(e[j]), i: +(e[j + 1] as number) })
  return out
}

/** accumulator used by the build: add(raw, witness, tokenIndex) for every token that is not a lexicon spelling */
export function newAccumulator() {
  const m = new Map<string, UnlinkedEntry>()
  return {
    m,
    add(raw: string, w: string, i: number) {
      const k = key(raw); if (!k) return
      const e = m.get(k)
      if (!e) { m.set(k, [raw, 1, 1, w, i]); return }
      e[1] = (e[1] as number) + 1
      const seen = occurrencesOf(e).map(o => o.w)
      if (!seen.includes(w)) { e[2] = (e[2] as number) + 1; if (seen.length < UNLINKED_MAX_WITNESSES) e.push(w, i) }
    },
  }
}
export function shardsOf(m: Map<string, UnlinkedEntry>, n = UNLINKED_SHARDS): Record<string, UnlinkedEntry>[] {
  const out: Record<string, UnlinkedEntry>[] = Array.from({ length: n }, () => ({}))
  for (const [k, e] of m) out[unlinkedShard(k, n)]![k] = e
  return out
}
