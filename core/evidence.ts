/**
 * The Evidence Invariant (SPEC 00, P-1).
 *
 * > "all pipelines and detections should be evidence based in the project" — the user, 2026-10-11
 * > "Project rule: every stress or register claim we store needs a source, a verbatim quote and a locator.
 * >  If there is no evidence, the value is `unknown`." — research/08
 *
 * A `Claim<T>` cannot exist without evidence; the single escape hatch is `unknown()`.
 */

/** Q = verbatim quote, P = paraphrase (shown with a badge), D = data record (VESUM line, attestation in context). */
export type EvidenceKind = 'Q' | 'P' | 'D'

export interface Evidence {
  source: string          // id in SOURCES (core/sources.ts) or a witness id
  quote: string           // verbatim, ≤ 300 chars
  locator: string         // URL, §, chapter.section, column.line, folio
  kind: EvidenceKind
  note?: string
}

export const UNKNOWN = 'unknown' as const
export type Unknown = typeof UNKNOWN

export interface Claim<T> { value: T | Unknown; evidence: Evidence[]; score?: number; method?: string }

export class EvidenceError extends Error {}

const valid = (e: Evidence) => !!(e.source && e.quote?.trim() && e.locator?.trim() && 'QPD'.includes(e.kind))

/** P-1.1/P-1.2: the only way to assert a value. Throws on missing or malformed evidence. */
export function claim<T>(value: T, evidence: Evidence | Evidence[], extra: Pick<Claim<T>, 'score' | 'method'> = {}): Claim<T> {
  const ev = ([] as Evidence[]).concat(evidence)
  if (!ev.length) throw new EvidenceError(`claim(${String(value)}) without evidence`)
  const bad = ev.find(e => !valid(e))
  if (bad) throw new EvidenceError(`malformed evidence for ${String(value)}: ${JSON.stringify(bad)}`)
  return { value, evidence: ev.map(e => ({ ...e, quote: e.quote.slice(0, 300) })), ...extra }
}

/** P-3.1: unknown is a first-class answer and needs no evidence. */
export const unknown = <T = never>(): Claim<T> => ({ value: UNKNOWN, evidence: [] })

export const isKnown = <T>(c: Claim<T>): c is Claim<T> & { value: T } => c.value !== UNKNOWN

/** Shorthand constructors keep rule tables terse. */
export const Q = (source: string, locator: string, quote: string, note?: string): Evidence => ({ source, locator, quote, kind: 'Q', note })
export const P = (source: string, locator: string, quote: string, note?: string): Evidence => ({ source, locator, quote, kind: 'P', note })
export const D = (source: string, locator: string, quote: string, note?: string): Evidence => ({ source, locator, quote, kind: 'D', note })

/** Noisy-OR combination of independent rule weights: score = 1 − Π(1 − wᵢ) (research/05 §3.2 "Scoring"). */
export const noisyOr = (ws: number[]) => 1 - ws.reduce((p, w) => p * (1 - w), 1)
