/**
 * BUILD stage, linking (SPEC 20 B-2, SPEC 10 M-3): token → modern VESUM lemma. Pure functions over a VESUM hit table.
 *
 * > B-2: "For each token, in order (first success wins; all evidence kept): torot-lemma, stanza-lemma, token, direct."
 * > B-2.1: "Ambiguity: several VESUM lemmas → choose by (a) the lemma's frequency CLASS among modern witnesses (direct links; class = number of decimal digits of f, 0 if unattested),
 * >  then (b) fewest branch rules (Candidate.branches), then (c) higher frequency, then (d) keep the first and list the others in link.value.alternatives.
 * >  The method string records which tie-breaker decided."  (a) precedes (b) because ikavism (R10) is a rule WITH lexical exceptions: богъ → біг/бог, отъ → іт/от,
 * >  скотъ → скіт/скот are all VESUM words and 'applied' always has fewer branches (REPORT 2025-10: «богъ → БіГ»).
 * > M-3.2: "A candidate becomes a link only if it is a VESUM form (D-evidence: the VESUM line)."
 */
import { ruleById, type Candidate } from '../core/phonology.ts'
import { foldById } from '../core/orthography.ts'
import { key } from '../core/text.ts'
import type { TraceStep, VesumHit } from '../core/types.ts'
import { compatible, vesumClass, type VClass } from '../core/pos-gate.ts'
import { correspondenceFor, type Correspondence } from '../core/correspondences.ts'

export type Route = 'torot-lemma' | 'stanza-lemma' | 'token' | 'direct'
/** B-2 order; lower rank = stronger route (used when one spelling is reached by several routes). */
export const ROUTE_RANK: Record<Route, number> = { 'torot-lemma': 0, 'stanza-lemma': 1, token: 2, direct: 3 }

/** What the linker needs to know about one token type (everything that influences the result). */
export interface TypeCtx { lang: 'orv' | 'chu-rus' | 'chu' | 'ruthenian' | 'uk' | 'undetermined'; oldI: boolean; orth?: string; raw: string; lemma?: string; stanza?: string; gate?: string }   // gate = FX-1 POS-gate key of the token's own annotation (core/pos-gate.ts)
export interface Env {
  hits: ReadonlyMap<string, VesumHit[]>
  derive: (s: string, oldI: boolean) => { norm: string; candidates: Candidate[] }
  fold: (s: string, orth?: string) => Candidate[]
}
export interface Option { id: string; lemma: string; form: string; hit: VesumHit; cand: Candidate; tier: number; own: Candidate; ownConfirmed: boolean; cls: VClass; corr?: { row: Correspondence; old: string } }
export interface Chosen extends Option { alternatives: string[]; decidedBy: 'unique' | 'tier' | 'branches' | 'frequency' | 'first' }

/** 0 = unflagged, 1 = arch/alt/short (historical or variant but not substandard), 2 = bad/err/subst/slang/vulg/obsc. */
export const tierOf = (tags: string) => /:(bad|err|subst|slang|vulg|obsc)\b/.test(':' + tags) ? 2 : /:(arch|alt|short)\b/.test(':' + tags) ? 1 : 0
const isHead = (h: VesumHit, k: string) => key(h.lemma) === k

function toOption(k: string, h: VesumHit, cand: Candidate, own: Candidate, ownConfirmed: boolean): Option {
  return { id: key(h.lemma), lemma: h.lemma, form: key(h.lemma) === k ? h.lemma : k, hit: h, cand, tier: tierOf(h.tags), own, ownConfirmed, cls: vesumClass(h.tags) }
}

/** B-2.1 — pure, tested. Options are deduplicated by lemma id (best tier, then fewest branches). */
const fclass = (n: number) => (n > 0 ? String(Math.floor(n)).length : 0)
export function chooseLemma(opts: Option[], freq: ReadonlyMap<string, number>): Chosen | undefined {
  const best = new Map<string, Option>()
  // same id = same lemma up to case (VESUM lists «Князь» surname and «князь» noun): the common-noun spelling is the display form
  const lower = (o: Option) => (o.lemma === o.lemma.toLowerCase() ? 0 : 1)
  // FX-3: homonyms of different POS class (VESUM «да» particle vs «ДА» noun) are distinct options even though key() makes them one id
  const bk = (o: Option) => o.id + '|' + o.cls
  for (const o of opts) { const p = best.get(bk(o)); if (!p || o.tier < p.tier || (o.tier === p.tier && (o.cand.branches < p.cand.branches || (o.cand.branches === p.cand.branches && lower(o) < lower(p))))) best.set(bk(o), o) }
  const all = [...best.values()]
  if (!all.length) return undefined
  const minTier = Math.min(...all.map(o => o.tier))
  const pool = all.filter(o => o.tier === minTier)
  const sorted = pool.map((o, i) => ({ o, i })).sort((a, b) => fclass(freq.get(b.o.id) ?? 0) - fclass(freq.get(a.o.id) ?? 0) || a.o.cand.branches - b.o.cand.branches || (freq.get(b.o.id) ?? 0) - (freq.get(a.o.id) ?? 0) || a.i - b.i).map(x => x.o)
  const [top, second] = sorted as [Option, Option | undefined]
  const decidedBy: Chosen['decidedBy'] = !second ? (all.length > 1 ? 'tier' : 'unique')
    : fclass(freq.get(top.id) ?? 0) > fclass(freq.get(second.id) ?? 0) ? 'frequency'
    : top.cand.branches < second.cand.branches ? 'branches'
    : (freq.get(top.id) ?? 0) > (freq.get(second.id) ?? 0) ? 'frequency' : 'first'
  const alternatives = [...sorted.slice(1), ...all.filter(o => o.tier !== minTier)].map(o => o.lemma)
  return { ...top, alternatives, decidedBy }
}

const better = (a: Candidate, b: Candidate) => a.branches - b.branches
/** Own modern form of the token for the lemma routes: the derived candidate that VESUM lists under that lemma, else the first candidate. */
function ownFor(id: string, cands: Candidate[], hits: Env['hits']): { own: Candidate; ok: boolean } {
  const ok = cands.filter(c => hits.get(key(c.form))?.some(h => key(h.lemma) === id)).sort(better)[0]
  return ok ? { own: ok, ok: true } : { own: [...cands].sort(better)[0] ?? { form: '', trace: [], branches: 0 }, ok: false }
}

/** First successful route for one token type (B-2). Returns the route with ALL its options (disambiguated later by chooseLemma). */
export function linkOptions(t: TypeCtx, env: Env): { route: Route; opts: Option[] } | undefined {
  // FX-1: every route keeps only analyses whose POS class is compatible with the token's own POS annotation; an empty route falls through to the next
  const gated = (os: Option[]) => os.filter(o => compatible(t.gate, o.hit.tags))
  const viaLemma = (lemma: string): Option[] => {
    const raw = env.derive(t.raw, t.oldI).candidates
    // FX-2: a cited suppletive correspondence (азъ → я, …) replaces the lemma; only VESUM analyses of the stated POS class count
    const row = correspondenceFor(lemma)
    const corr = row ? { row, old: lemma } : undefined
    const via = (l: string, c0?: typeof corr): Option[] => env.derive(l, t.oldI).candidates.flatMap(c => {
      const k = key(c.form)
      return (env.hits.get(k) ?? []).filter(h => isHead(h, k) && (!c0 || vesumClass(h.tags) === c0.row.cls)).map(h => { const o = ownFor(key(h.lemma), raw, env.hits); return { ...toOption(k, h, c, o.own, o.ok), ...(c0 ? { corr: c0 } : {}) } })
    })
    const viaCorr = corr ? gated(via(corr.row.modern, corr)) : []
    return viaCorr.length ? viaCorr : gated(via(lemma))
  }
  if (t.lemma) { const opts = viaLemma(t.lemma); if (opts.length) return { route: 'torot-lemma', opts } }
  // BL-19: a model lemma is accepted only if corroborated: the token's own derived form is a VESUM form of that lemma
  if (t.stanza) { const opts = viaLemma(t.stanza).filter(o => o.ownConfirmed); if (opts.length) return { route: 'stanza-lemma', opts } }
  if (t.lang !== 'uk' && !t.lemma && !t.stanza && correspondenceFor(key(t.raw))) {   // un-lemmatised witness (Sophia): the same cited suppletive correspondence applies to the raw form
    const opts = viaLemma(key(t.raw)); if (opts.length) return { route: 'token', opts }
  }
  if (t.lang !== 'uk') {
    const opts = gated(env.derive(t.raw, t.oldI).candidates.flatMap(c => (env.hits.get(key(c.form)) ?? []).map(h => toOption(key(c.form), h, c, c, true))))
    if (opts.length) return { route: 'token', opts }
  } else {
    const opts = env.fold(key(t.raw), t.orth).flatMap(c => (env.hits.get(key(c.form)) ?? []).map(h => toOption(key(c.form), h, c, c, true)))
    if (opts.length) return { route: 'direct', opts }
  }
  return undefined
}

/** Candidate keys a token type may need from VESUM (collected before the single pass). */
export function wantedKeys(t: TypeCtx, env: Pick<Env, 'derive' | 'fold'>): string[] {
  const out: string[] = []
  for (const l of [t.lemma, t.stanza]) if (l) {
    for (const c of env.derive(l, t.oldI).candidates) out.push(key(c.form))
    const row = correspondenceFor(l); if (row) for (const c of env.derive(row.modern, t.oldI).candidates) out.push(key(c.form))
  }
  if (t.lang !== 'uk' && !t.lemma && !t.stanza) { const row = correspondenceFor(key(t.raw)); if (row) for (const c of env.derive(row.modern, t.oldI).candidates) out.push(key(c.form)) }
  if (t.lang !== 'uk') for (const c of env.derive(t.raw, t.oldI).candidates) out.push(key(c.form))
  else for (const c of env.fold(key(t.raw), t.orth)) out.push(key(c.form))
  return out
}

// ── derivation trace (P-1.5) ────────────────────────────────────────────────────────────────────
const show = (s: string) => s.replaceAll('', 'о').replaceAll('', 'е').replaceAll('·', '')
/** Re-apply the recorded rule ids to `start`, one TraceStep each; the last step ends at the final candidate form. */
export function traceSteps(start: string, c: Candidate): TraceStep[] {
  let s = start; const out: TraceStep[] = []
  for (const id of c.trace) {
    const r = ruleById[id] ?? foldById[id]
    if (!r) continue
    const n = r.apply(s)
    out.push({ rule: id, from: show(s), to: show(n) }); s = n
  }
  if (out.length && ruleById[c.trace[c.trace.length - 1]!]) out[out.length - 1]!.to = c.form
  return out
}

const POS: Record<string, string> = { noun: 'іменник', verb: 'дієслово', adj: 'прикметник', adv: 'прислівник', prep: 'прийменник', conj: 'сполучник', part: 'частка', intj: 'вигук', numr: 'числівник', noninfl: 'незмінне', predic: 'предикатив', insert: 'вставне слово' }
const GENDER: Record<string, string> = { m: 'ч.р.', f: 'ж.р.', n: 'с.р.' }
/** Ukrainian POS label from VESUM lemma tags (verbatim tags stay in the paradigm). */
export function posLabel(tags: string): string {
  const t = tags.split(':')
  const base = t.includes('pron') || t.includes('&pron') ? 'займенник' : (POS[t[0] ?? ''] ?? (t[0] || 'невідомо'))
  const g = t[0] === 'noun' ? t.find(x => x in GENDER) : undefined
  return g ? `${base}, ${GENDER[g]}` : base
}
