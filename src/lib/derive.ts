/**
 * Derivation trace steps (SPEC 00 P-1.5: "one step per rule, each step with its citation").
 * core/derive() returns only rule ids; replaying exactly those rules in order over the normalised input reproduces the candidate
 * (a rule that did not change the form is absent from the trace and is a no-op for the replay).
 */
import { ruleById, derive, type Candidate } from '../../core/phonology.ts'
import { reverse } from '../../core/reverse.ts'
import { key } from '../../core/text.ts'
import type { Kwic, LemmaCard, TraceStep } from '../../core/types.ts'
import type { SearchIndex } from './search.ts'

/** Internal markers of core/phonology.ts: U+E001/U+E002 vocalised strong jers, '·' a lost weak jer. */
export const pretty = (s: string) => s.replaceAll('', 'о').replaceAll('', 'е').replaceAll('·', '').replace(/ъ/g, 'ъ')

export function traceSteps(norm: string, trace: string[]): TraceStep[] {
  const steps: TraceStep[] = []; let cur = norm
  for (const id of trace) { const next = ruleById[id]!.apply(cur); steps.push({ rule: id, from: pretty(cur), to: pretty(next) }); cur = next }
  return steps
}

export interface DerivedCandidate extends Candidate { steps: TraceStep[] }
// ── SPEC 30 D-2/D-4 glue: lexicon-backed paradigm + attestation lookups for core/reverse.ts ──────────
export interface Attest { lemma: string; kwic: Kwic }
/** Normalised old spelling (FormCard.norm / raw) → its lemma and the first KWIC line (D-2.3 "attested in any admitted witness"). */
export function attestIndex(cards: LemmaCard[]): Map<string, Attest> {
  const m = new Map<string, Attest>()
  for (const c of cards) for (const f of c.forms) {
    const kwic = f.kwic[0] ?? { w: 'corpus', loc: f.raw, left: '', node: f.raw, right: '', date: f.date }
    for (const k of [key(f.norm), key(f.raw)]) if (!m.has(k)) m.set(k, { lemma: c.lemma, kwic })
  }
  return m
}
/** VESUM forms of the lemma the modern word belongs to (empty when the word is not in the lexicon: nothing then licenses о/е or fleeting-vowel inversions). */
export function paradigmOf(word: string, idx: SearchIndex, cards: Map<string, LemmaCard>): { lemma?: string; forms: string[] } {
  const h = idx.map.get(key(word))?.[0], c = h && cards.get(h.lemma)
  return c ? { lemma: c.lemma, forms: c.paradigm.map(p => p.form) } : { forms: [] }
}
export function reconstruct(word: string, idx: SearchIndex, cards: Map<string, LemmaCard>, att: Map<string, Attest>) {
  const p = paradigmOf(word, idx, cards)
  return { ...p, ...reverse(word, { paradigm: p.forms, attested: s => att.get(s)?.kwic ?? null }) }
}

export function deriveWithSteps(raw: string, opts: { oldI?: boolean } = {}) {
  const d = derive(raw, opts)
  return { ...d, candidates: d.candidates.map((c): DerivedCandidate => ({ ...c, steps: traceSteps(d.norm, c.trace) })) }
}
