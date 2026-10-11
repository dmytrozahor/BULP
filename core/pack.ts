/**
 * lexicon.json packing (B-5): the same Evidence objects (one stress-dictionary note, one witness description, one Shevelov URL…) repeat thousands of times across cards.
 * pack() interns each distinct Evidence once in `ev` and replaces it inside the cards' `evidence` arrays by its integer index; unpack() restores the cards (shared objects). Lossless.
 */
import type { Evidence } from './evidence.ts'
import type { LemmaCard, PackedLexicon } from './types.ts'

/** Cards hold Evidence only in arrays under these keys (Claim.evidence, StressVariant.evidence). */
const EV_KEYS = new Set(['evidence', 'authorEvidence'])
const isEv = (o: unknown): o is Evidence => !!o && typeof o === 'object' && typeof (o as Evidence).source === 'string' && typeof (o as Evidence).quote === 'string' && typeof (o as Evidence).locator === 'string'
const map = (x: unknown, f: (k: string, v: unknown[]) => unknown[]): unknown =>
  Array.isArray(x) ? x.map(v => map(v, f)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, EV_KEYS.has(k) && Array.isArray(v) ? f(k, v) : map(v, f)])) : x

/** An interning pool: one() packs a card against it, so cards (or tier variants) can be sized/packed incrementally with shared evidence. */
export function packer() {
  const ev: Evidence[] = [], ix = new Map<string, number>(); let used = new Set<number>()
  const id = (e: unknown) => {
    if (!isEv(e)) return e
    const k = JSON.stringify(e); let i = ix.get(k)
    if (i === undefined) { i = ev.length; ev.push(e); ix.set(k, i) }
    used.add(i); return i
  }
  /** one(c) → the packed card and the pool indices it references */
  return { ev, one: (c: LemmaCard) => { used = new Set(); const p = map(c, (_, v) => v.map(id)) as LemmaCard; return { card: p, refs: [...used] } } }
}

export function pack(cards: LemmaCard[]): PackedLexicon {
  const p = packer(), out = cards.map(c => p.one(c).card)
  return { format: 2, ev: p.ev, cards: out }
}

/** Inverse of pack(); a plain LemmaCard[] (fixture, pre-pool data) passes through. */
export function unpack(j: unknown): LemmaCard[] {
  if (Array.isArray(j)) return j as LemmaCard[]
  const p = j as PackedLexicon
  if (!p || p.format !== 2 || !Array.isArray(p.ev) || !Array.isArray(p.cards)) throw new Error('lexicon.json: unknown format')
  return map(p.cards, (_, v) => v.map(i => (typeof i === 'number' ? p.ev[i]! : i))) as LemmaCard[]
}
