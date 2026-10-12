/**
 * One detector engine for every rule table (SPEC 00 P-4.2). A rule fires only if it has a citation and weight > 0
 * (P-1.3); weight-0 rules become *hints* that queue a form for review but never set a label (P-3.1).
 *
 * > "score(label) = 1 − Π(1 − wᵢ) over the rules that fire. A normative VESUM hit with no bad/subst/alt/arch vetoes
 * >  every MOR-, SFX- and PFX- rule." — research/05 §3.2
 */
import { claim, noisyOr, type Claim, type Evidence } from './evidence.ts'

export interface VesumHit { lemma: string; tags: string }
export interface Ctx {
  form: string                       // key(): lower case, no stress
  norm?: string                      // stage-N normalised old spelling (old witnesses)
  year?: number                      // composition year; undefined = user input (treated as contemporary)
  vesum: VesumHit[]                  // all VESUM analyses of the form
  lt?: { file: 'replace' | 'soft'; suggest: string }
  inLexicon: (form: string) => VesumHit[]   // VESUM lookup for doublet checks
  derive?: (old: string) => string[]        // phonology candidates (for CS doublets)
}

/** A rule's test returns null (no fire) or the data evidence that triggered it (P-1.4). */
export interface Rule {
  id: string; axis: 'cs' | 'contact' | 'dialect' | 'register' | 'rusyn'; label: string; weight: number
  cite: Evidence; test: (c: Ctx) => Evidence | null; note?: string
  /** SPEC 60 DD-1: first attestation of the feature (year, from a dated Q source). Absent = undated; the rule keeps its own blanket gate. */
  earliest?: number
  /** the dated source for `earliest`; added to the claim's evidence when the rule fires (P-1.4) */
  earliestCite?: Evidence
}

export interface Detection { claims: Record<string, Claim<true>>; hints: { rule: string; label: string }[] }

export function detect(rules: Rule[], c: Ctx): Detection {
  const fired: Record<string, { r: Rule; trig: Evidence }[]> = {}
  const hints: Detection['hints'] = []
  for (const r of rules) {
    const trig = r.test(c)
    if (!trig) continue
    if (r.weight <= 0) { hints.push({ rule: r.id, label: r.label }); continue }
    ;(fired[r.label] ??= []).push({ r, trig })
  }
  // SPEC 60 DD-2: features are listed oldest first; undated rules keep table order after the dated ones (Array.sort is stable)
  const age = (r: Rule) => r.earliest ?? 1e9
  const claims = Object.fromEntries(Object.entries(fired).map(([label, hits]) => {
    const ord = [...hits].sort((a, b) => age(a.r) - age(b.r))
    const ev = ord.flatMap(h => [h.r.cite, ...(h.r.earliestCite ? [h.r.earliestCite] : []), h.trig])
    return [label, claim(true as const, ev, { score: +noisyOr(ord.map(h => h.r.weight)).toFixed(3), method: ord.map(h => h.r.id).join('+') })]
  }))
  return { claims, hints }
}

// helpers for rule tables
export const TAG = (c: Ctx, t: string) => c.vesum.find(h => h.tags.split(':').includes(t))
export const normative = (c: Ctx) => c.vesum.some(h => !/:(bad|err|subst|alt|arch|slang|up92|short)\b/.test(':' + h.tags))
export const modern = (c: Ctx) => c.year === undefined || c.year >= 1919
