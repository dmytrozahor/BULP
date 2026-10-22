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
import { correspondenceFor, variantFor, type Correspondence } from '../core/correspondences.ts'
import { oesPast } from '../core/oes-folds.ts'
import { velarCandidates } from '../core/palatalization.ts'
import { MU_ORTH, muById, muCandidates } from '../core/mu-fold.ts'
import type { AltLink } from '../core/vesum-alt.ts'
import { PART_HYPH_FOLD, splitHyphenParticle } from '../core/gal-folds.ts'

export type Route = 'torot-lemma' | 'stanza-lemma' | 'token' | 'direct'
/** B-2 order; lower rank = stronger route (used when one spelling is reached by several routes). */
export const ROUTE_RANK: Record<Route, number> = { 'torot-lemma': 0, 'stanza-lemma': 1, token: 2, direct: 3 }

/** What the linker needs to know about one token type (everything that influences the result). */
export interface TypeCtx { lang: 'orv' | 'chu-rus' | 'chu' | 'ruthenian' | 'uk' | 'undetermined'; oldI: boolean; orth?: string; raw: string; lemma?: string; stanza?: string; gate?: string; past?: boolean }   // gate = FX-1 POS-gate key of the token's own annotation (core/pos-gate.ts)
export interface Env {
  hits: ReadonlyMap<string, VesumHit[]>
  derive: (s: string, oldI: boolean) => { norm: string; candidates: Candidate[] }
  fold: (s: string, orth?: string) => Candidate[]
  /** SPEC 63 MU: also try the phonetic MU folds (second VESUM pass, only for tokens unresolved by the first) */
  phon?: boolean
  /** SPEC 63 MM-10: key(VESUM :alt lemma) → its standard lemma (core/vesum-alt.ts altStandardMap) */
  altStd?: ReadonlyMap<string, AltLink>
}
export interface Option { id: string; lemma: string; form: string; hit: VesumHit; cand: Candidate; tier: number; own: Candidate; ownConfirmed: boolean; cls: VClass; corr?: { row: Correspondence; old: string }; /** MM-10: the VESUM :alt lemma this option was reached through; `lemma` is already the standard one */ altOf?: string }
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
  for (const o of opts) { const p = best.get(bk(o)); if (!p || o.tier < p.tier || (o.tier === p.tier && (!!o.hit.ik < !!p.hit.ik || !!o.hit.ik === !!p.hit.ik && (o.cand.branches < p.cand.branches || (o.cand.branches === p.cand.branches && lower(o) < lower(p)))))) best.set(bk(o), o) }
  const all = [...best.values()]
  if (!all.length) return undefined
  const minTier = Math.min(...all.map(o => o.tier))
  // MM-11: a form that is the е-variant of a doublet cell in one lemma (легінь p.v_naz «легіні ~ легені») and the plain form of another lemma (легеня) goes to the other one; the variant lemma stays an alternative
  const tiered = all.filter(o => o.tier === minTier), plain = tiered.filter(o => !o.hit.ik)
  const pool = plain.length ? plain : tiered
  const sorted = pool.map((o, i) => ({ o, i })).sort((a, b) => fclass(freq.get(b.o.id) ?? 0) - fclass(freq.get(a.o.id) ?? 0) || a.o.cand.branches - b.o.cand.branches || (freq.get(b.o.id) ?? 0) - (freq.get(a.o.id) ?? 0) || a.i - b.i).map(x => x.o)
  const [top, second] = sorted as [Option, Option | undefined]
  const decidedBy: Chosen['decidedBy'] = !second ? (all.length > 1 ? 'tier' : 'unique')
    : fclass(freq.get(top.id) ?? 0) > fclass(freq.get(second.id) ?? 0) ? 'frequency'
    : top.cand.branches < second.cand.branches ? 'branches'
    : (freq.get(top.id) ?? 0) > (freq.get(second.id) ?? 0) ? 'frequency' : 'first'
  const alternatives = [...sorted.slice(1), ...all.filter(o => !pool.includes(o))].map(o => o.lemma)
  return { ...top, alternatives, decidedBy }
}

const better = (a: Candidate, b: Candidate) => a.branches - b.branches
/** Own modern form of the token for the lemma routes: the derived candidate that VESUM lists under that lemma, else the first candidate. */
function ownFor(id: string, cands: Candidate[], hits: Env['hits']): { own: Candidate; ok: boolean } {
  const ok = cands.filter(c => hits.get(key(c.form))?.some(h => key(h.lemma) === id)).sort(better)[0]
  return ok ? { own: ok, ok: true } : { own: [...cands].sort(better)[0] ?? { form: '', trace: [], branches: 0 }, ok: false }
}

/** SPEC 63 MU-2: last resort for Middle Ukrainian text in modern letters. A cited morphology fold yields a candidate; VESUM must list it with the analysis the fold states (`expect`),
 *  and the token's own POS gate (if any) must agree. Tie-breaks treat every MU rule as a branch, so a plain route always wins. */
const muAccepts = (m: { trace: string[]; last: { group: string } }, h: VesumHit) =>
  m.trace.every(id => muById[id]!.expect(h.tags))                               // every rule of the chain states its analysis (an enclitic split needs a past-tense verb)
  && !/:(prop|abbr|slang|vulg|obsc)\b/.test(':' + h.tags) && h.lemma[0] === h.lemma[0]!.toLowerCase()   // names get name cards instead; no abbreviation / slang homophone
  && !(m.last.group === 'phon' && /^verb\b/.test(h.tags) && h.tags.split(':').includes('1'))             // phonetic-only candidates never turn a token into a 1st-person verb form (всею ≠ всію «засіваю»)
function muOptions(t: TypeCtx, env: Env): Option[] {
  if (!t.orth || !MU_ORTH.has(t.orth)) return []
  const out: Option[] = []
  // MM-3: for a non-Ukrainian-labelled witness the first pass derives the token (R16 turns полки into повки), so the PLAIN modern spelling was never tried; the phonetic fold о > і
  // then moved полки (pl. of полк «regiment») to пілка (dim. of пола). A token that is itself a VESUM form of a common lemma keeps that lemma: a plain route always wins over a fold.
  if (t.lang !== 'uk') {
    // the letter ы of the witness (R11 ы > и: полкы = полки) belongs to the plain route as well; no other old-letter rule is applied to a token of a modernised edition
    const k = key(t.raw), k11 = key(ruleById['R11']!.apply(k)), plains: Candidate[] = [{ form: k, trace: [], branches: 0 }, ...(k11 !== k ? [{ form: k11, trace: ['R11'], branches: 0 }] : [])]
    for (const plain of plains) for (const h of env.hits.get(key(plain.form)) ?? []) if (!/:(prop|abbr|slang|vulg|obsc)\b/.test(':' + h.tags) && h.lemma[0] === h.lemma[0]!.toLowerCase() && compatible(t.gate, h.tags)) out.push(toOption(key(plain.form), h, plain, plain, true))
    if (out.length) return out
  }
  for (const m of muCandidates(key(t.raw), !!env.phon)) {
    const cands: Candidate[] = t.lang === 'uk' ? [{ form: m.form, trace: m.trace, branches: m.trace.length }]
      : [...env.derive(m.form, t.oldI).candidates.map(d => ({ form: d.form, trace: [...m.trace, ...d.trace], branches: d.branches + m.trace.length })),
        // MM-3: the edition is in modern letters: the fold's own result (only ы > и applied) is a candidate too, because the old-letter chain turns полку into повку (R16)
        { form: key(ruleById['R11']!.apply(m.form)), trace: m.trace, branches: m.trace.length }]
    for (const c of cands) for (const h of env.hits.get(key(c.form)) ?? []) if (muAccepts(m, h) && compatible(t.gate, h.tags)) out.push(toOption(key(c.form), h, c, c, true))
  }
  return out
}

/** First successful route for one token type (B-2). Returns the route with ALL its options (disambiguated later by chooseLemma). */
/** MM-1: a one-letter token that is a known preposition (с, в, к, у, о, з) never links to a pronoun / noun / adjective / numeral lemma, whatever its annotation says
 *  (PVL «с» = з, TOROT tags some of them Pk «себе»); it goes to its preposition lemma (с → з). The reflexive enclitic сѧ / ся is a different spelling and keeps себе. */
export const ONE_LETTER_PREP: ReadonlySet<string> = new Set(['с', 'в', 'к', 'у', 'о', 'з'])
const PREP_LEMMA: Record<string, string> = { с: 'з' }
/** MM-2a: a token written with a lower-case initial prefers common-noun (non-:prop) analyses; a surname / proper-name reading (VESUM «Хомік») is kept only when nothing else links. */
const isProp = (o: Option) => /:prop\b/.test(':' + o.hit.tags)
/** MM-15: an all-caps abbreviation lemma (VESUM «ДА noun:nv:abbr # Державний архів») is never the lemma of a lower-case token when a common lemma exists (да part:bad) */
const isAbbr = (o: Option) => /:abbr\b/.test(':' + o.hit.tags)
export function preferCommon(t: TypeCtx, r: { route: Route; opts: Option[] } | undefined): { route: Route; opts: Option[] } | undefined {
  if (!r || !t.raw || t.raw[0] === t.raw[0]!.toUpperCase() && t.raw[0] !== t.raw[0]!.toLowerCase()) return r
  const common = r.opts.filter(o => !isProp(o) && !isAbbr(o))
  return common.length && common.length < r.opts.length ? { route: r.route, opts: common } : r
}
const gatedBy = (t: TypeCtx, os: Option[]) => os.filter(o => compatible(t.gate, o.hit.tags))
/** MM-3: where a candidate used R10 (о, е > і in a new closed syllable), the same chain WITHOUT R10 is a second candidate: R10 has lexical exceptions (богъ → біг / бог),
 *  and «полъкы» (PVL / Мономах, pl. of полк «regiment») must be able to reach полки, not only пілки (dim. of пола). chooseLemma decides by frequency class, as for богъ. The plain
 *  sibling comes second, so an exact tie keeps the previous choice. */
export function withPlain(norm: string, cands: Candidate[]): Candidate[] {
  return cands.flatMap(c => {
    if (!c.trace.includes('R10')) return [c]
    const ids = c.trace.filter(i => i !== 'R10')
    let s = norm
    for (const id of ids) { const r = ruleById[id] ?? foldById[id]; if (r) s = r.apply(s) }
    s = show(s)
    return s === c.form ? [c] : [c, { form: s, trace: ids, branches: c.branches }]
  })
}
const candsOf = (env: Pick<Env, 'derive'>, raw: string, oldI: boolean) => { const d = env.derive(raw, oldI); return withPlain(d.norm, d.candidates) }
/** MM-10: an option whose VESUM lemma is an `:alt` spelling (термінольоґія, 1928/Галичина) is moved to the standard lemma found by the cited 1928 folds (core/orth1928.ts):
 *  the token's own chain gains those fold ids, so the trace shows ґ > г, льо > ло with their quotes. The VESUM line that proved the form stays the evidence (hit.tags minus `alt`). */
export function remapAlt<T extends { route: Route; opts: Option[] }>(r: T | undefined, env: Pick<Env, 'altStd'>): T | undefined {
  if (!r || !env.altStd?.size) return r
  const opts = r.opts.map(o => {
    const a = /:alt\b/.test(':' + o.hit.tags) ? env.altStd!.get(o.id) : undefined
    if (!a) return o
    const ext = (c: Candidate): Candidate => ({ form: a.trace.reduce((s, id) => foldById[id]!.apply(s), c.form), trace: [...c.trace, ...a.trace], branches: c.branches + a.trace.length })
    return { ...o, id: key(a.std), lemma: a.std, tier: 0, hit: { lemma: a.std, tags: o.hit.tags.replace(/:alt\b/, '') }, cand: ext(o.cand), own: ext(o.own), altOf: a.alt }
  })
  return { ...r, opts }
}
/** MM-14: a closed-class lemma has ONE etymon vowel, stated by ЕСУМ, and the ikavism step R10 (о, е > і) is only the reflex of THAT vowel. між < *medja «межа» (е): a token written with о
 *  (можь, GVL s.a. 6766 = a form of мужь / мочи) is never turned into між by о > і; it needs the е (межь, мѣжь) or the finished reflex (мижъ, між). */
export const ETYMON_VOWEL: Record<string, { vowel: 'е'; quote: string; url: string }> = {
  між: { vowel: 'е', quote: 'псл. *medji, *medjū, місц. в. одн. і дв. іменника *medja «межа»;', url: 'https://goroh.pp.ua/Етимологія/між' },
}
export function etymonVowelGate<T extends { route: Route; opts: Option[] }>(t: TypeCtx, r: T | undefined): T | undefined {
  if (!r) return r
  const o = key(t.raw).includes('о') ? r.opts.filter(x => !(ETYMON_VOWEL[x.id] && x.cand.trace.includes('R10'))) : r.opts
  return o.length === r.opts.length ? r : o.length ? { ...r, opts: o } : undefined
}
/** MM-20: a token that does not link whole and ends in a hyphenated clitic particle (прийми-ж, було-б, ходи-но) links through its HOST word (core/gal-folds.ts ORTH-PART-HYPH); VESUM decides first,
 *  so будь-хто, де-не-де and every hyphenated word VESUM lists keep their own link. The step is recorded in the trace. */
export function linkOptions(t: TypeCtx, env: Env): { route: Route; opts: Option[] } | undefined {
  const r = remapAlt(etymonVowelGate(t, preferCommon(t, linkOptionsPrep(t, env))), env)
  if (r) return r
  const sp = t.raw ? splitHyphenParticle(key(t.raw)) : undefined
  if (!sp) return undefined
  const h = linkOptions({ ...t, raw: t.raw.slice(0, sp.host.length), lemma: undefined, stanza: undefined, gate: undefined }, env)
  const add = (c: Candidate): Candidate => ({ ...c, trace: [PART_HYPH_FOLD.id, ...c.trace], branches: c.branches + 1 })
  return h ? { ...h, opts: h.opts.map(o => ({ ...o, cand: add(o.cand), own: add(o.own) })) } : undefined
}
function linkOptionsPrep(t: TypeCtx, env: Env): { route: Route; opts: Option[] } | undefined {
  const k1 = key(t.raw)
  // MM-2: a lower-case token spelled exactly like a dictionary-cited variant (хомик, хомік) links to the standard card (хом'як), never to the surname «Хомік»
  const vr0 = t.raw && t.raw === t.raw.toLowerCase() ? variantFor(k1) : undefined
  const vr = vr0 && (!vr0.orth || (t.orth && vr0.orth.includes(t.orth))) ? vr0 : undefined   // MM-21: a variant row may be restricted to witnesses of an orthography (ню = вона only in Желехівка texts)
  if (vr) {
    const mk = key(vr.modern), own: Candidate = { form: k1, trace: [], branches: 0 }
    const opts = gatedBy(t, (env.hits.get(mk) ?? []).filter(h => isHead(h, mk) && vesumClass(h.tags) === vr.cls && !/:prop\b/.test(':' + h.tags))
      .map(h => ({ ...toOption(mk, h, { form: mk, trace: [], branches: 0 }, own, false), corr: { row: vr, old: k1 } })))
    if (opts.length) return { route: t.lang === 'uk' ? 'direct' : 'token', opts }
  }
  if (!ONE_LETTER_PREP.has(k1)) return linkOptionsCore(t, env)
  const lemma = PREP_LEMMA[k1] ?? k1
  const opts = (env.hits.get(lemma) ?? []).filter(h => isHead(h, lemma) && vesumClass(h.tags) === 'prep').map(h => { const c: Candidate = { form: lemma, trace: [], branches: 0 }; return toOption(lemma, h, c, c, true) })
  if (opts.length) return { route: t.lang === 'uk' ? 'direct' : 'token', opts }
  const r = linkOptionsCore(t, env)
  const kept = r?.opts.filter(o => !['pron', 'noun', 'adj', 'adjp', 'numr'].includes(o.cls)) ?? []
  return r && kept.length ? { route: r.route, opts: kept } : undefined
}
function linkOptionsCore(t: TypeCtx, env: Env): { route: Route; opts: Option[] } | undefined {
  // FX-1: every route keeps only analyses whose POS class is compatible with the token's own POS annotation; an empty route falls through to the next
  const gated = (os: Option[]) => os.filter(o => compatible(t.gate, o.hit.tags))
  const viaLemma = (lemma: string): Option[] => {
    const raw = env.derive(t.raw, t.oldI).candidates
    // FX-2: a cited suppletive correspondence (азъ → я, …) replaces the lemma; only VESUM analyses of the stated POS class count
    const row = correspondenceFor(lemma)
    const corr = row ? { row, old: lemma } : undefined
    const via = (l: string, c0?: typeof corr): Option[] => env.derive(l, c0 ? false : t.oldI).candidates.flatMap(c => {
      const k = key(c.form)
      return (env.hits.get(k) ?? []).filter(h => isHead(h, k) && (!c0 || (vesumClass(h.tags) === c0.row.cls && !/:prop\b/.test(':' + h.tags)))).map(h => { const o = ownFor(key(h.lemma), raw, env.hits); return { ...toOption(k, h, c, o.own, o.ok), ...(c0 ? { corr: c0 } : {}) } })
    })
    // MM-5: a cited correspondence is not vetoed by a MODEL part of speech (gate key U:… = Stanza UPOS, P-1.7): VESUM and the cited row decide, the model tag never overrides them
    const viaCorr = corr ? (t.gate?.startsWith('U:') ? via(corr.row.modern, corr) : gated(via(corr.row.modern, corr))) : []
    return viaCorr.length ? viaCorr : gated(via(lemma))
  }
  if (t.lemma) { const opts = viaLemma(t.lemma); if (opts.length) return { route: 'torot-lemma', opts } }
  // BL-19: a model lemma is accepted only if corroborated: the token's own derived form is a VESUM form of that lemma
  if (t.stanza) {
    // PV-8b: the model lemma of a finite PAST verb is also corroborated by a cited aorist / imperfect ending + matching stem (core/oes-folds.ts oesPast); the tense is recorded as a trace step
    const past = t.past ? oesPast(t.raw, t.stanza) : undefined
    const opts = viaLemma(t.stanza).flatMap(o => o.ownConfirmed || o.corr?.row.kind === 'cognate' || o.corr?.row.kind === 'cs' ? [o] : past && o.cls === 'verb' ? [{ ...o, own: { ...o.own, trace: [...o.own.trace, past.id], branches: o.own.branches + 1 } }] : [])
    if (opts.length) return { route: 'stanza-lemma', opts }
  }
  if (t.lang !== 'uk' && !t.lemma && !t.stanza && correspondenceFor(key(t.raw))) {   // un-lemmatised witness (Sophia): the same cited suppletive correspondence applies to the raw form
    const opts = viaLemma(key(t.raw)); if (opts.length) return { route: 'token', opts }
  }
  if (t.lang !== 'uk') {
    const opts = gated(candsOf(env, t.raw, t.oldI).flatMap(c => (env.hits.get(key(c.form)) ?? []).map(h => toOption(key(c.form), h, c, c, true))))
    if (opts.length) return { route: 'token', opts }
    // R24r (BL-20): ц/з/с before и/і/ѣ → the velar-stem lemma (помози → помогти, руцѣ → рука); last resort, VESUM must list the lemma with the right POS
    const pal = gated(env.derive(t.raw, t.oldI).candidates.flatMap(c => velarCandidates(key(c.form)).flatMap(v =>
      (env.hits.get(v.lemma) ?? []).filter(h => isHead(h, v.lemma) && (v.cls === 'verb' ? /^verb:[a-z]+:inf\b/.test(h.tags) : h.tags.startsWith('noun') && (!v.gender || h.tags.includes(':' + v.gender)))).map(h => {
        const rc: Candidate = { form: v.restored, trace: [...c.trace, 'R24r'], branches: c.branches + 1 }
        return toOption(v.lemma, h, rc, rc, true)
      }))))
    if (pal.length) return { route: 'token', opts: pal }
  } else {
    const opts = env.fold(key(t.raw), t.orth).flatMap(c => (env.hits.get(key(c.form)) ?? []).map(h => toOption(key(c.form), h, c, c, true)))
    if (opts.length) return { route: 'direct', opts }
  }
  const mu = muOptions(t, env); if (mu.length) return { route: t.lang === 'uk' ? 'direct' : 'token', opts: mu }
  return undefined
}

/** Candidate keys a token type may need from VESUM (collected before the single pass). */
export function wantedKeys(t: TypeCtx, env: Pick<Env, 'derive' | 'fold' | 'phon'>): string[] {
  const out: string[] = []
  for (const l of [t.lemma, t.stanza]) if (l) {
    for (const c of env.derive(l, t.oldI).candidates) out.push(key(c.form))
    const row = correspondenceFor(l); if (row) for (const c of env.derive(row.modern, false).candidates) out.push(key(c.form))
  }
  if (t.lang !== 'uk' && !t.lemma && !t.stanza) { const row = correspondenceFor(key(t.raw)); if (row) for (const c of env.derive(row.modern, false).candidates) out.push(key(c.form)) }
  if (t.raw && t.raw === t.raw.toLowerCase()) { const vr = variantFor(key(t.raw)); if (vr && (!vr.orth || (t.orth && vr.orth.includes(t.orth)))) out.push(key(vr.modern)) }   // MM-2, MM-21
  { const sp = t.raw ? splitHyphenParticle(key(t.raw)) : undefined; if (sp) out.push(...wantedKeys({ ...t, raw: t.raw.slice(0, sp.host.length), lemma: undefined, stanza: undefined, gate: undefined }, env)) }   // MM-20
  if (t.lang !== 'uk') for (const c of candsOf(env, t.raw, t.oldI)) { out.push(key(c.form)); for (const v of velarCandidates(key(c.form))) out.push(v.lemma) }
  else for (const c of env.fold(key(t.raw), t.orth)) out.push(key(c.form))
  if (t.orth && MU_ORTH.has(t.orth) && t.lang !== 'uk') { out.push(key(t.raw), key(ruleById['R11']!.apply(key(t.raw)))) }   // MM-3: the plain spelling and its ы > и
  if (t.orth && MU_ORTH.has(t.orth)) for (const m of muCandidates(key(t.raw), !!env.phon)) { if (t.lang === 'uk') out.push(key(m.form)); else { out.push(key(ruleById['R11']!.apply(m.form))); for (const c of env.derive(m.form, t.oldI).candidates) out.push(key(c.form)) } }
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
