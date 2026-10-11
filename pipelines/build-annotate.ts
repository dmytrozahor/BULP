/**
 * BUILD stage, annotations (SPEC 20 B-1, B-3). Every label is made by claim() from core/evidence.ts (P-1.1) — this file
 * contains no other way to construct a non-unknown Claim.
 *
 * > B-3.2: "LT-only non-normative entries are upgraded to russianism_or_hybrid only if ru.json says the form is a known Russian
 * >  dictionary word (evidence D: pymorphy3-dicts-ru) and VESUM has no normative analysis."
 * > B-3.5: "tie-breaks research/06 §3.2 (vetted > provisional; narrower range; autograph > ms_copy > first_ed > scholarly_ed;
 * >  person > institution; else coFirst)."
 * > B-3.7: "status unknown (the source is not a normative dictionary; research/08 A3 'A merely attested stress … with no label is unknown')"
 */
import { claim, unknown, D, type Claim, type Evidence } from '../core/evidence.ts'
import { detect, normative, type Ctx, type Rule } from '../core/detect.ts'
import { CS_RULES, CONTACT_RULES, DIALECT_RULES, RUSYN_RULES, RUSYN_SHARED, REGISTER_RULES, SURZHYK_BASIS, SURZHYK_DEF, detectRusyn, rusynClaim } from '../core/rules.ts'
import { ruleById } from '../core/phonology.ts'
import { key } from '../core/text.ts'
import { assignEpoch } from '../core/epochs.ts'
import type { FirstAttestation, FormCard, LemmaCard, LexIndex, StressVariant, TraceStep, VesumHit, WitnessOut } from '../core/types.ts'
import { admissible, type Author } from './authors.ts'
import type { Chosen, Route } from './build-link.ts'

export const VESUM_LOC = 'dict_corp_vis.txt v6.8.6'

// ── B-1.1 admission ─────────────────────────────────────────────────────────────────────────────
export type Admission = { ok: true } | { ok: false; why: string }
/** B-1.1: author admissible, and — when the author record has no evidence of its own — the witness must carry authorEvidence (≥1 Q). */
export function admit(w: Pick<WitnessOut, 'id' | 'author' | 'authorEvidence'> & { excludeReason?: WitnessOut['excludeReason'] }, author: Author | undefined): Admission {
  if (w.excludeReason) return { ok: false, why: w.excludeReason.why + ' — ' + w.excludeReason.evidence.map(e => `«${e.quote.slice(0, 80)}…» (${e.locator})`).join('; ') }
  if (!author) return { ok: false, why: `автор «${w.author}» не має запису верифікації (P-2.2)` }
  if (!admissible(author)) return { ok: false, why: `статус автора «${author.status}» (P-2.2)` }
  if (author.evidence.length === 0 && !(w.authorEvidence ?? []).some(e => e.kind === 'Q'))
    return { ok: false, why: 'запис автора без свідчень і пам’ятка не містить authorEvidence (B-1.1)' }
  return { ok: true }
}

// ── accumulators ────────────────────────────────────────────────────────────────────────────────
export interface Ref { wi: number; ti: number }
export interface FormAcc {
  raw: string; norm: string; modern: string; f: number; oldI: boolean
  date: [number, number]; latest: [number, number]; firstW: string; firstLoc: string
  epochs: Set<string>; route: Route; chosen: Chosen; ref: Ref; first: Ref
  kwic: Ref[]; perW: Map<string, number>; orvVernacular: boolean
  regions: Set<string>   // ids of witnesses >= 1798 with a region (B-3.6)
}

// ── detection (B-3.1) ───────────────────────────────────────────────────────────────────────────
export const DETECT_RULES: Rule[] = [...CS_RULES, ...CONTACT_RULES, ...DIALECT_RULES]
/** All rule tables for reporting; the Rusyn axis runs through detectRusyn() (shared rows only count once a RUE-/PAN- row fired, research/10 §5). */
export const REPORT_RULES: Rule[] = [...DETECT_RULES, ...RUSYN_RULES, ...RUSYN_SHARED]
export const RULE_AXIS = new Map(REPORT_RULES.map(r => [r.label, r.axis]))
/** One detection pass: general tables + the Rusyn axis collapsed into the contract claim `rusyn` (value = axis label, types.ts). */
function runDetect(c: Ctx): { claims: Record<string, Claim<any>>; hints: { rule: string; label: string }[] } {
  const d = detect(DETECT_RULES, c), r = detectRusyn(c), rc = rusynClaim(r.claims)
  return { claims: rc ? { ...d.claims, rusyn: rc } : d.claims, hints: [...d.hints, ...r.hints] }
}
const dedupe = (ev: Evidence[]) => { const s = new Set<string>(); return ev.filter(e => { const k = JSON.stringify(e); return s.has(k) ? false : (s.add(k), true) }) }

export function mergeClaims(a: Record<string, Claim<any>>, b: Record<string, Claim<any>>): Record<string, Claim<any>> {
  const out = { ...a }
  for (const [l, c] of Object.entries(b)) {
    const p = out[l]
    out[l] = !p ? c : claim(true as const, dedupe([...p.evidence, ...c.evidence]), { score: Math.max(p.score ?? 0, c.score ?? 0), method: [...new Set(`${p.method}+${c.method}`.split('+'))].join('+') })
  }
  return out
}

export interface AnnEnv {
  hits: ReadonlyMap<string, VesumHit[]>
  lt: LexIndex['lt']
  ru: Record<string, { known: boolean; normal_form?: string; tag?: string }>
  derive: (s: string, oldI: boolean) => string[]
}
const ltOf = (env: AnnEnv, k: string): Ctx['lt'] => { const e = env.lt[k]; return e ? { file: e[0], suggest: e[1] } : undefined }

/** Context for one historical spelling at one attestation year (ctx.vesum = VESUM hits of the MODERN form, per B-3.1). */
export function cardCtx(f: Pick<FormAcc, 'raw' | 'norm' | 'modern' | 'oldI'>, year: number, env: AnnEnv, dry?: Set<string>): Ctx {
  const form = key(f.raw)
  return {
    form, norm: f.norm, year, lt: ltOf(env, form),
    vesum: dry ? [] : env.hits.get(key(f.modern)) ?? [],
    inLexicon: k => { const kk = key(k); if (dry) { dry.add(kk); return [] } return env.hits.get(kk) ?? [] },
    derive: s => env.derive(s, f.oldI),
  }
}

/** B-3.2 (second half): LEX-LT 'nonnormative' → russianism_or_hybrid iff ru.json knows the word AND VESUM has no normative analysis. */
export function upgradeLt(claims: Record<string, Claim<true>>, c: Ctx, ru: AnnEnv['ru']): Record<string, Claim<true>> {
  const lt = claims['nonnormative']
  const r = ru[c.form]
  if (!lt || !lt.method?.split('+').includes('LEX-LT') || claims['russianism_or_hybrid'] || !r?.known || normative(c)) return claims
  const rev = D('pymorphy3-dicts-ru', 'MorphAnalyzer(lang=ru), word_is_known', `${c.form} ${r.tag ?? ''} → ${r.normal_form ?? c.form}`.trim(), 'OpenCorpora: «відомо» = є в російському словнику, не гарантія нормативності')
  return { ...claims, russianism_or_hybrid: claim(true as const, dedupe([...lt.evidence, rev]), { score: lt.score, method: 'LEX-LT+ru-dict' }) }
}

export function detectCard(f: FormAcc, env: AnnEnv): { claims: Record<string, Claim<any>>; hints: string[] } {
  let claims: Record<string, Claim<any>> = {}; const hints = new Set<string>()
  for (const y of new Set([f.date[1], f.latest[1]])) {
    const c = cardCtx(f, y, env), d = runDetect(c)
    claims = mergeClaims(claims, upgradeLt(d.claims, c, env.ru)); d.hints.forEach(h => hints.add(h.rule))
  }
  return { claims, hints: [...hints] }
}

/** Dry run: which VESUM keys will detect() ask for? (lets ONE extra VESUM pass serve all lookups). */
export function lookupKeys(f: Pick<FormAcc, 'raw' | 'norm' | 'modern' | 'oldI' | 'date' | 'latest'>, env: AnnEnv): Set<string> {
  const s = new Set<string>([key(f.modern)])
  for (const y of new Set([f.date[1], f.latest[1]])) runDetect(cardCtx(f, y, env, s))
  return s
}

// ── B-3.5 first attestation ─────────────────────────────────────────────────────────────────────
export interface FirstCand { witness: string; author: Author; date: [number, number]; witnessType: string; loc: string; form: string; route: Route }
const WT = ['autograph', 'ms_copy', 'first_ed', 'scholarly_ed']
const rankKey = (c: FirstCand) => [c.date[1], c.author.status === 'vetted' ? 0 : 1, c.date[1] - c.date[0], Math.min(WT.indexOf(c.witnessType) < 0 ? WT.length : WT.indexOf(c.witnessType), WT.length), c.author.label === 'institutional' ? 1 : 0]
const cmpKey = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!; return 0 }
/** Earliest date.to; ties: vetted > provisional, narrower range, autograph > ms_copy > first_ed > scholarly_ed, person > institution; else coFirst. */
export function rankFirst(cands: FirstCand[]): { first: FirstCand; coFirst: string[] } | undefined {
  if (!cands.length) return undefined
  const sorted = cands.map((c, i) => ({ c, i, k: rankKey(c) })).sort((a, b) => cmpKey(a.k, b.k) || a.i - b.i)
  const top = sorted[0]!
  return { first: top.c, coFirst: sorted.slice(1).filter(x => cmpKey(x.k, top.k) === 0).map(x => x.c.witness) }
}

export function firstClaim(cands: FirstCand[], ws: Map<string, WitnessOut | Pick<WitnessOut, 'dateCite' | 'authorEvidence'>>, kwicLine: (c: FirstCand) => string): Claim<FirstAttestation> {
  const r = rankFirst(cands)
  if (!r) return unknown()
  const { first, coFirst } = r, w = ws.get(first.witness)!
  const vet = first.author.evidence[0] ?? w.authorEvidence?.[0]
  if (!vet) return unknown()
  const ev = [vet, D(first.witness, first.loc, kwicLine(first)), w.dateCite]
  return claim<FirstAttestation>({ author: first.author.id, witness: first.witness, loc: first.loc, date: first.date, witnessType: first.witnessType, form: first.form, coFirst },
    ev, { method: `earliest date.to; link: ${first.route}${first.route === 'stanza-lemma' ? ' (модельна лематизація, P-1.7)' : ''}` })
}

// ── B-5 form selection ──────────────────────────────────────────────────────────────────────────
/** ≤ max forms: 3 oldest, 2 most frequent modern-epoch (≥1818), then by frequency. */
export function selectForms<T extends { f: number; date: [number, number] }>(all: T[], max: number): T[] {
  if (all.length <= max) return [...all]
  const out = new Set<T>()
  const add = (xs: T[], n: number) => { for (const x of xs) { if (n <= 0 || out.size >= max) break; if (!out.has(x)) { out.add(x); n-- } } }
  add([...all].sort((a, b) => a.date[1] - b.date[1] || b.f - a.f), Math.min(3, max))
  add([...all].filter(x => x.date[1] >= 1818).sort((a, b) => b.f - a.f), 2)
  add([...all].sort((a, b) => b.f - a.f), max)
  return [...out]
}

// ── B-3.2 / B-3.3 / B-3.6 lemma level ───────────────────────────────────────────────────────────
export function registerClaim(paradigm: { form: string; tags: string }[], lemma: string): Claim<'colloquial'> {
  let acc: Record<string, Claim<true>> = {}
  for (const p of paradigm) {
    if (!/(slang|subst|short|vulg|obsc)/.test(p.tags)) continue
    const c: Ctx = { form: key(p.form), vesum: [{ lemma, tags: p.tags }], inLexicon: () => [] }
    acc = mergeClaims(acc, detect(REGISTER_RULES, c).claims)
    if (acc['colloquial'] && acc['colloquial'].evidence.length >= 6) break
  }
  const c = acc['colloquial']
  return c ? claim('colloquial' as const, c.evidence.slice(0, 8), { score: c.score, method: c.method }) : unknown()
}

/** Lemma-itself contact detection (year undefined = contemporary, so the modern()-gated rules apply) + LT upgrade. */
export function lemmaContact(lemma: string, env: AnnEnv): Record<string, Claim<true>> {
  const k = key(lemma), c: Ctx = { form: k, vesum: env.hits.get(k) ?? [], lt: ltOf(env, k), inLexicon: x => env.hits.get(key(x)) ?? [] }
  return upgradeLt(detect(CONTACT_RULES, c).claims, c, env.ru)
}

/** Lemma-level `rusyn` (plan 40 B2): union of the modern FormCards' rusyn claims; a specific variant outranks the undetermined `rusyn`, then the higher score. */
export function lemmaRusyn(cards: { claims: Record<string, Claim<any>> }[]): Claim<string> | undefined {
  const cs = cards.map(c => c.claims.rusyn as Claim<string> | undefined).filter((c): c is Claim<string> => !!c)
  if (!cs.length) return undefined
  const rank = (c: Claim<string>) => [c.value === 'rusyn' ? 0 : 1, c.score ?? 0]
  const best = [...cs].sort((a, b) => rank(b)[0]! - rank(a)[0]! || rank(b)[1]! - rank(a)[1]!)[0]!
  const same = cs.filter(c => c.value === best.value)
  return claim(best.value as string, dedupe(same.flatMap(c => c.evidence)).slice(0, 8), { score: best.score, method: [...new Set(same.flatMap(c => (c.method ?? '').split('+')))].join('+') })
}

export function surzhykClaim(cardClaims: Record<string, Claim<true>>[], lemmaClaims: Record<string, Claim<true>>): Claim<true> {
  const parts = [...cardClaims, lemmaClaims].flatMap(cl => SURZHYK_BASIS.filter(l => cl[l]).map(l => ({ l, c: cl[l]! })))
  if (!parts.length) return unknown()
  const labels = [...new Set(parts.map(p => p.l))]
  return claim(true as const, dedupe([...parts.flatMap(p => p.c.evidence), SURZHYK_DEF]).slice(0, 8), { method: `derived: ${labels.join('+')}`, score: Math.max(...parts.map(p => p.c.score ?? 0)) })
}

const isCs = (f: FormCard) => f.claims['church_slavonic']
/** B-3.3. native: orv attestation by torot-lemma/token, no CS claim anywhere, trace only G/X rules. church_slavonic: ≥1 CS claim, and CS-claimed forms carry ≥ half of the lemma's tokens (no vernacular doublet of comparable weight). */
export function originClaim(cards: { card: FormCard; acc: FormAcc }[]): LemmaCard['claims']['origin'] {
  const cs = cards.filter(x => isCs(x.card)), fAll = cards.reduce((s, x) => s + x.card.f, 0), fCs = cs.reduce((s, x) => s + x.card.f, 0)
  if (cs.length && fCs * 2 >= fAll) {
    const ev = cs.flatMap(x => x.card.claims['church_slavonic']!.evidence).slice(0, 6)
    return claim('church_slavonic' as const, dedupe(ev), { method: `CS-claim on ${cs.length} form(s), ${fCs}/${fAll} tokens`, score: Math.max(...cs.map(x => x.card.claims['church_slavonic']!.score ?? 0)) })
  }
  if (cs.length) return unknown()
  const nat = cards.filter(x => x.acc.orvVernacular && (x.acc.route === 'torot-lemma' || x.acc.route === 'token') && x.acc.chosen.own.trace.every(id => ['G', 'X'].includes(ruleById[id]?.scope ?? '')))
    .sort((a, b) => a.card.date[1] - b.card.date[1])[0]
  if (!nat) return unknown()
  const tr = nat.acc.chosen.own.trace, steps = tr.length ? tr.join('→') : 'без змін'
  const ev = [D(nat.acc.firstW, nat.acc.firstLoc, `${nat.card.raw} → ${nat.card.modern} (${steps})`), ...nat.card.link.evidence.slice(0, 1), ...tr.map(id => ruleById[id]!.cite).slice(0, 4)]
  return claim('native' as const, dedupe(ev), { method: 'orv attestation, G/X-rules only', score: undefined })
}

// ── B-3.7 stress ────────────────────────────────────────────────────────────────────────────────
export interface StressJson { source?: string; forms: Record<string, { stressed: string; positions: number[]; ambiguous: boolean }[]> }
export function stressVariants(forms: string[], sj: StressJson | undefined): StressVariant[] {
  if (!sj) return []
  const out: StressVariant[] = [], seen = new Set<string>()
  for (const form of forms) for (const v of sj.forms[form] ?? []) {
    const k = v.stressed; if (seen.has(k)) continue; seen.add(k)
    out.push({ form, positions: v.positions, status: 'unknown', method: 'dictionary',
      evidence: [D('ukrainian-word-stress', 'ULIF-derived', v.stressed, `${sj.source ?? 'ukrainian-word-stress'}; словниковий запис без контексту${v.ambiguous ? '; омограф' : ''}; статус невідомий (research/08 A3)`)] })
  }
  return out
}

/** Epoch id of a date (shev, primary = containing the midpoint). */
export function primaryEpoch(date: [number, number], scheme: 'shev' | 'wl'): string | undefined {
  const a = assignEpoch(date, scheme)
  if (a.value === 'unknown') return undefined
  const mid = (date[0] + date[1]) / 2
  return a.value.epochs.find(id => id !== undefined && inEpoch(id, mid)) ?? a.value.epochs[0]
}
import { epochById } from '../core/epochs.ts'
const inEpoch = (id: string, y: number) => { const e = epochById[id]; return !!e && y >= e.start && y <= e.end }
