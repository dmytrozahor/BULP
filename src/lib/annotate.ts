/**
 * Text annotator core (pure): (text, data, year?) → AnnotatedToken[].
 * > "Pattern hints may *queue a form for review*, never set a label (research/08 B2)" — SPEC 00 P-3.1
 * Status per token: attested (in lexicon.json: lemma or historical spelling) · lexindex (known only via VESUM/LT index) ·
 * rules (unknown to both; only ungated rules with evidence fired) · unknown (muted, no label).
 * EXTENSION POINT: `provenance` is 'attested' today; a later feature will add 'derived' (reconstructed/suggested forms) with
 * `derivedFrom`. They must be drawn distinctly (CSS .derived: dashed outline, italic, «реконструкція» badge).
 */
import type { FormCard, LemmaCard, TraceStep, VesumHit } from '../../core/types.ts'
import type { Claim } from '../../core/evidence.ts'
import { isKnown } from '../../core/evidence.ts'
import { assignEpoch } from '../../core/epochs.ts'
import { key, normalizeOld, tokenize } from '../../core/text.ts'
import { type SearchIndex, type Via } from './search.ts'
import { runDetectors, strongest, type Category, type LexData } from './analyze.ts'

export type Status = 'attested' | 'lexindex' | 'rules' | 'unknown'
export interface AnnotateData extends LexData { search: SearchIndex; cards: Map<string, LemmaCard> }

export interface AnnotatedToken {
  raw: string; start: number; end: number; key: string
  status: Status
  provenance: 'attested' | 'derived'                 // reserved: 'derived' not produced yet
  derivedFrom?: { form: string; trace: TraceStep[] }  // reserved for reconstructed forms
  lemma?: string; card?: LemmaCard; form?: FormCard; via?: Via
  claims: Record<string, Claim<true>>; hints: { rule: string; label: string }[]
  vesum?: VesumHit[]; lt?: [string, string]          // lexindex data that triggered the rules (D-evidence context)
  mark?: Category; epoch?: string                    // epoch = shev epoch of the lemma's first attestation
}

const VIA_ORDER: Via[] = ['form', 'lemma', 'paradigm']

/** Merge lemma-level claims into the claim set (form-level claims win on a label clash). */
function claimsOf(card: LemmaCard, form?: FormCard): Record<string, Claim<true>> {
  const out: Record<string, Claim<true>> = {}
  const c = card.claims
  if (isKnown(c.register)) out.colloquial = c.register as unknown as Claim<true>
  if (isKnown(c.surzhyk)) out.surzhyk = c.surzhyk
  if (isKnown(c.origin) && c.origin.value === 'church_slavonic') out.church_slavonic = c.origin as unknown as Claim<true>
  for (const [code, cl] of Object.entries(c.dialect)) if (isKnown(cl)) out[code] = cl
  return { ...out, ...(form?.claims ?? {}) }
}

export function shevEpochOf(card: LemmaCard): string | undefined {
  if (!isKnown(card.first)) return undefined
  const a = assignEpoch(card.first.value.date, 'shev')
  return isKnown(a) ? a.value.epochs[0] : undefined
}

export function annotate(text: string, data: AnnotateData, year?: number): AnnotatedToken[] {
  const out: AnnotatedToken[] = []
  let from = 0
  for (const t of tokenize(text)) {
    const at = text.indexOf(t.raw, from); const start = at < 0 ? t.index : at
    from = start + t.raw.length
    const k = key(t.raw), kn = key(normalizeOld(t.raw).norm)
    const hits = [...(data.search.map.get(k) ?? []), ...(k !== kn ? data.search.map.get(kn) ?? [] : [])]
      .sort((a, b) => VIA_ORDER.indexOf(a.via) - VIA_ORDER.indexOf(b.via))
    const base = { raw: t.raw, start, end: from, key: k, provenance: 'attested' as const }
    const hit = hits[0], card = hit && data.cards.get(hit.lemma)
    if (hit && card) {
      const form = card.forms.find(f => [f.raw, f.norm, f.modern].some(x => key(x) === k || key(x) === kn))
      const claims = claimsOf(card, form)
      out.push({ ...base, status: 'attested', lemma: card.lemma, card, form, via: hit.via, claims, hints: form?.hints.map(h => ({ rule: h, label: '' })) ?? [],
        mark: strongest(claims), epoch: shevEpochOf(card) })
      continue
    }
    const a = runDetectors(t.raw, data, year)
    const has = Object.keys(a.claims).length > 0
    out.push({ ...base, status: a.known ? 'lexindex' : has ? 'rules' : 'unknown', claims: a.claims, hints: a.hints, vesum: a.vesum, lt: a.lt, mark: strongest(a.claims) })
  }
  return out
}

export interface Summary {
  total: number; linked: number; pct: number
  byStatus: Record<Status, number>; byMark: Record<Category, number>
  epochProfile: Record<string, number>; unknown: string[]
}
export function summarize(tokens: AnnotatedToken[]): Summary {
  const byStatus: Summary['byStatus'] = { attested: 0, lexindex: 0, rules: 0, unknown: 0 }
  const byMark = { cs: 0, contact: 0, dialect: 0, colloquial: 0, archaic: 0 } as Summary['byMark']
  const lemmas = new Map<string, string>(), unknown = new Set<string>()
  for (const t of tokens) {
    byStatus[t.status]++
    if (t.mark) byMark[t.mark]++
    if (t.status === 'attested' && t.lemma && t.epoch) lemmas.set(t.lemma, t.epoch)
    if (t.status === 'unknown' || t.status === 'rules') unknown.add(t.key)
  }
  const epochProfile: Record<string, number> = {}
  for (const e of lemmas.values()) epochProfile[e] = (epochProfile[e] ?? 0) + 1
  const total = tokens.length
  return { total, linked: byStatus.attested, pct: total ? byStatus.attested / total : 0, byStatus, byMark, epochProfile, unknown: [...unknown] }
}
