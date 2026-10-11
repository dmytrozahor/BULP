/**
 * Derivation trace steps (SPEC 00 P-1.5: "one step per rule, each step with its citation").
 * core/derive() returns only rule ids; replaying exactly those rules in order over the normalised input reproduces the candidate
 * (a rule that did not change the form is absent from the trace and is a no-op for the replay).
 */
import { ruleById, derive, type Candidate } from '../../core/phonology.ts'
import type { TraceStep } from '../../core/types.ts'

/** Internal markers of core/phonology.ts: U+E001/U+E002 vocalised strong jers, '·' a lost weak jer. */
export const pretty = (s: string) => s.replaceAll('', 'о').replaceAll('', 'е').replaceAll('·', '').replace(/ъ/g, 'ъ')

export function traceSteps(norm: string, trace: string[]): TraceStep[] {
  const steps: TraceStep[] = []; let cur = norm
  for (const id of trace) { const next = ruleById[id]!.apply(cur); steps.push({ rule: id, from: pretty(cur), to: pretty(next) }); cur = next }
  return steps
}

export interface DerivedCandidate extends Candidate { steps: TraceStep[] }
export function deriveWithSteps(raw: string, opts: { oldI?: boolean } = {}) {
  const d = derive(raw, opts)
  return { ...d, candidates: d.candidates.map((c): DerivedCandidate => ({ ...c, steps: traceSteps(d.norm, c.trace) })) }
}
