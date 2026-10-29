/**
 * Text annotator core (pure): (text, data, year?) → AnnotatedToken[].
 * > "Pattern hints may *queue a form for review*, never set a label (research/08 B2)" — SPEC 00 P-3.1
 * Status per token: attested (in lexicon.json: lemma or historical spelling) · lexindex (known only via VESUM/LT index) ·
 * rules (unknown to both; only ungated rules with evidence fired) · unknown (muted, no label).
 * SPEC 30 D-4.1: `provenance` 'derived' = the spelling is not in the lexicon but derive() maps it to a lexicon form (`derivedFrom`);
 * drawn distinctly (CSS .derived: dashed outline, italic, «реконструкція» badge) and not counted as `linked`.
 */
import type { CoreCard, CoreForm, TraceStep, VesumHit } from '../../core/types.ts'
import type { Claim } from '../../core/evidence.ts'
import { isKnown } from '../../core/evidence.ts'
import { assignEpoch } from '../../core/epochs.ts'
import { derive } from '../../core/phonology.ts'
import { traceSteps } from './derive.ts'
import { key, normalizeOld, tokenize } from '../../core/text.ts'
import { type CardLookup, type SearchIndex, type Via } from './search.ts'
import { hitsOf, runDetectors, strongest, type Category, type LexData } from './analyze.ts'
import { contactCorr, type ContactCorr } from '../../core/contact-corr.ts'
import { findNumerals, type Numeral } from '../../core/numerals.ts'
import { detectSyntax, type SyntaxSpan } from '../../core/syntax.ts'
import { fold } from '../../core/orthography.ts'
import { foldById } from '../../core/orthography.ts'
import { PART_HYPH_FOLD, splitHyphenParticle, withGal } from '../../core/gal-folds.ts'
import { FEATURE_RULE_IDS } from '../../core/feature-chips.ts'
import type { RuClass, RuLookups } from '../../core/ru-contact.ts'
import { featurePairs, variantHit, wordRules, type FeaturePair, type VariantHit } from '../../core/word-rules.ts'
import { COPULA_FORMS, COPULA_RULE, type CopulaReading } from '../../core/copula-ikavism.ts'
import { isShortCandidate, type ShortReading } from '../../core/short-forms.ts'

export type Status = 'attested' | 'lexindex' | 'rules' | 'unknown'
export interface AnnotateData extends LexData { search: SearchIndex; cards: CardLookup; /** MM-25: Russian headwords of the r2u ru→uk dictionaries (optional; without it no Russianism is detected) */ ru?: Pick<RuLookups, 'ruHead' | 'isDialect'> }

export interface AnnotatedToken {
  raw: string; start: number; end: number; key: string
  status: Status
  provenance: 'attested' | 'derived'
  derivedFrom?: { form: string; trace: TraceStep[] }  // modern form + rule steps of a derived token
  lemma?: string; card?: CoreCard; form?: CoreForm; via?: Via
  claims: Record<string, Claim<true>>; hints: { rule: string; label: string }[]
  vesum?: VesumHit[]; lt?: [string, string]          // lexindex data that triggered the rules (D-evidence context)
  numeral?: Numeral                                  // BL-4/N11: a Cyrillic numeral (value, not a word; same object on every token of the run)
  ruClass?: RuClass                                  // MM-25: a Russian headword of the r2u dictionaries that is no Ukrainian lemma: type by year (суржик / ЦС-книжна / язичіє), counterparts from the same article
  variant?: VariantHit                               // MM-30..34: the spelling belongs to a variant family (межи / мендзи → між, увесь → весь, тілько-що → тільки, уві → у, како → як); the source or «джерела не знайдено»
  pairs?: FeaturePair[]                              // MM-29 / MM-35: the cited feature that links this spelling with a counterpart, both directions (керовати ↔ керувати, міст-ові → міст)
  features?: string[]                                // MM-16: ids of the cited feature rules (core/feature-chips.ts) that link this spelling (сь before a labial, -ійш-, hyphenated particle …)
  short?: ShortReading                               // MM-42 / MM-43: the short-form reading (го = його, тре = треба, шо = що …): the chip «енклітична форма займенника» / «розмовна редукція (мовця)» and, where the short form is also a word, both readings
  copula?: CopulaReading                             // MM-38: «їсть» may be the copula єсть (Galician ikavism є → ї): both readings, verdict eat / copula / ambiguous; never a silent choice
  contact?: ContactCorr                              // MM-9: the token is a contact (surzhyk) FORM; its literary counterpart and Russian variant
  mark?: Category; epoch?: string                    // epoch = shev epoch of the lemma's first attestation
}

const OLD_LETTERS = /[ѣъыѧѫѥѵѡѿѹꙋ]|оу/
const VIA_ORDER: Via[] = ['form', 'lemma', 'paradigm']

/** Merge lemma-level claims into the claim set (form-level claims win on a label clash). */
function claimsOf(card: CoreCard, form?: CoreForm): Record<string, Claim<true>> {
  const out: Record<string, Claim<true>> = {}
  const c = card.claims
  if (isKnown(c.register)) out.colloquial = c.register as unknown as Claim<true>
  // MM-9 rule 2: the lemma-level surzhyk aggregate is NOT copied to a token: a contact label is a property of the form (form.claims, below), never of the lemma
  if (isKnown(c.origin) && c.origin.value === 'church_slavonic') out.church_slavonic = c.origin as unknown as Claim<true>
  for (const [code, cl] of Object.entries(c.dialect)) if (isKnown(cl)) out[code] = cl
  const ru = c.rusyn   // optional (B0 contract); absent in older data
  if (ru && isKnown(ru)) out[ru.value] = ru as unknown as Claim<true>
  return { ...out, ...(form?.claims ?? {}) }
}

export function shevEpochOf(card: CoreCard): string | undefined {
  if (!isKnown(card.first)) return undefined
  const a = assignEpoch(card.first.value.date, 'shev')
  return isKnown(a) ? a.value.epochs[0] : undefined
}

function foldSteps(start: string, trace: string[]): TraceStep[] {
  const out: TraceStep[] = []; let cur = start
  for (const id of trace) { const f = foldById[id]; if (!f) continue; const next = f.apply(cur); out.push({ rule: id, from: cur, to: next }); cur = next }
  return out
}
function galLink(k: string, data: AnnotateData) {
  const sp = splitHyphenParticle(k)
  const cands = [...(sp ? [{ form: sp.host, trace: [PART_HYPH_FOLD.id], branches: 1 }] : []), ...withGal(fold(k, 'желехівка'), k)]
  for (const c of cands) {
    if (c.form === k) continue
    const h = (data.search.map.get(key(c.form)) ?? [])[0], card = h && data.cards.get(h.lemma)
    if (h && card) return { c, via: h.via, card }
  }
  return undefined
}

/** the lexicon lookup of the shared rule functions: a card form / paradigm form, or a VESUM / LT index entry */
export const knownKeyOf = (data: AnnotateData) => (kk: string) => (data.search.map.get(kk)?.length ?? 0) > 0 || hitsOf(data, kk).length > 0

/** MM-38: witness context of the text (orth, regions) that gates the Galician-ikavism reading of їсть */
export interface AnnotateCtx { orth?: string; witnessRegion?: string; authorRegion?: string; /** MM-43: the witness is a folk record / a character's speech (qualifier of the reduction chip) */ genre?: 'folklore' | 'speech' }
export function annotate(text: string, data: AnnotateData, year?: number, wctx: AnnotateCtx = {}): AnnotatedToken[] {
  const out: AnnotatedToken[] = []
  let from = 0
  const nums = findNumerals(text)
  const knownKey = knownKeyOf(data)
  const toks = tokenize(text)
  for (const [ti, t] of toks.entries()) {
    const at = text.indexOf(t.raw, from); const start = at < 0 ? t.index : at
    from = start + t.raw.length
    const numeral = nums.find(n => start >= n.start && from <= n.end)
    if (numeral) { out.push({ raw: t.raw, start, end: from, key: key(t.raw), provenance: 'attested', status: 'unknown', claims: {}, hints: [], numeral }); continue }
    const k = key(t.raw), kn = key(normalizeOld(t.raw).norm)
    const hits = [...(data.search.map.get(k) ?? []), ...(k !== kn ? data.search.map.get(kn) ?? [] : [])]
      .sort((a, b) => VIA_ORDER.indexOf(a.via) - VIA_ORDER.indexOf(b.via))
    const base = { raw: t.raw, start, end: from, key: k, provenance: 'attested' as const }
    const variant = variantHit(k), pairs = featurePairs(k, knownKey)   // MM-29..36: the SAME shared rule functions as the search keys and «Аналіз слова» (core/word-rules.ts)
    const extra: { variant?: VariantHit; pairs?: FeaturePair[]; copula?: CopulaReading; short?: ShortReading } = { ...(variant ? { variant } : {}), ...(pairs.length ? { pairs } : {}) }
    const hit = hits[0], card = hit && data.cards.get(hit.lemma)
    // MM-38: the SAME shared rule function (wordRules) as search and «Аналіз слова»; the neighbours are the cues, the witness orth / region the gate
    const copula = COPULA_FORMS[k] ? wordRules(t.raw, { known: knownKey }, { ...wctx, prev: toks[ti - 1] && key(toks[ti - 1]!.raw), next: toks[ti + 1] && key(toks[ti + 1]!.raw),
      sentStart: ti === 0 || /[.!?…]\s*$/.test(text.slice(0, start)), tagsOf: kk => hitsOf(data, kk).map(h => h.tags) }).copula : undefined
    if (copula) extra.copula = copula
    // MM-42 / MM-43: the SAME shared rule function (wordRules → core/short-forms.ts); the neighbours, the characters around the token and the apostrophe flag are the cues
    const short = isShortCandidate(k) ? wordRules(t.raw, { known: knownKey }, { ...wctx, year, raw: t.raw, lead: !!t.lead, before: text.slice(Math.max(0, start - 3), start), after: text.slice(from, from + 3),
      prev: toks[ti - 1] && key(toks[ti - 1]!.raw), next: toks[ti + 1] && key(toks[ti + 1]!.raw), sentStart: ti === 0 || /[.!?…]s*$/.test(text.slice(0, start)), tagsOf: kk => hitsOf(data, kk).map(h => h.tags) }).short : undefined
    if (short) extra.short = short
    // 'full' verdicts that name another lemma: го = його (not for the hyphenated «видів-го»: its host links), тре + infinitive = треба; шо / ше / шоб / тра are linked by their variant family below
    const scard = short?.verdict === 'full' && (short.kind === 'elision' || (short.kind === 'enclitic' && !k.includes('-')) || short.form === 'тре') ? data.cards.get(short.fullLemma) : undefined
    if (short && scard) {
      const cl = claimsOf(scard)
      out.push({ ...base, ...extra, provenance: 'derived', derivedFrom: { form: short.full, trace: [{ rule: short.rule, from: k, to: short.full }] }, status: 'attested', lemma: scard.lemma, card: scard, via: 'form', claims: cl, hints: [], mark: strongest(cl), epoch: shevEpochOf(scard), features: [short.rule] }); continue
    }
    const bcard = copula?.verdict === 'copula' ? data.cards.get('бути') : undefined
    if (copula && bcard) {
      const cl = claimsOf(bcard)
      out.push({ ...base, ...extra, provenance: 'derived', derivedFrom: { form: copula.copulaForm, trace: [{ rule: COPULA_RULE, from: k, to: copula.copulaForm }] }, status: 'attested', lemma: bcard.lemma, card: bcard, via: 'form', claims: cl, hints: [], mark: strongest(cl), epoch: shevEpochOf(bcard), features: [COPULA_RULE] }); continue
    }
    if (hit && card) {
      const form = card.forms.find(f => [f.raw, f.norm, f.modern].some(x => key(x) === k || key(x) === kn))
      const claims = claimsOf(card, form)
      out.push({ ...base, ...extra, status: 'attested', lemma: card.lemma, card, form, via: hit.via, claims, hints: form?.hints.map(h => ({ rule: h, label: '' })) ?? [],
        mark: strongest(claims), epoch: shevEpochOf(card) })
      continue
    }
    // MM-16 / MM-20: the SAME cited candidates the build tries (Желехівка folds, core/gal-folds.ts, the hyphenated-particle split) for a spelling the lexicon lacks; a hypothesis ('derived'), never a corpus link
    const gal = hit ? undefined : galLink(k, data)
    if (gal) { out.push({ ...base, ...extra, provenance: 'derived', derivedFrom: { form: gal.c.form, trace: foldSteps(k, gal.c.trace) }, status: 'attested', lemma: gal.card.lemma, card: gal.card, via: gal.via, claims: claimsOf(gal.card), hints: [], mark: strongest(claimsOf(gal.card)), epoch: shevEpochOf(gal.card), features: gal.c.trace.filter(id => FEATURE_RULE_IDS.includes(id)) }); continue }
    // MM-30..34: a member of a variant family (межи, мендзи, увесь, тілько-що, уві) that the lexicon lacks links to the head of the family: a hypothesis, labelled with the member's own source
    const vh = !hit && variant && !variant.member.peer ? (data.search.map.get(key(variant.head)) ?? [])[0] : undefined, vcard = vh && data.cards.get(vh.lemma)
    if (variant && vh && vcard) { const cl = claimsOf(vcard); out.push({ ...base, ...extra, provenance: 'derived', derivedFrom: { form: variant.head, trace: [{ rule: variant.family.id, from: k, to: variant.head }] }, status: 'attested', lemma: vcard.lemma, card: vcard, via: vh.via, claims: cl, hints: [], mark: strongest(cl), epoch: shevEpochOf(vcard) }); continue }
    // SPEC 30 D-4.1: an old-script spelling that is not in the lexicon but derives (core/phonology) to a lexicon form is linked as 'derived' (a hypothesis)
    const a = runDetectors(t.raw, data, year)
    const has = Object.keys(a.claims).length > 0
    const dv = OLD_LETTERS.test(k) && !a.known && !has ? derive(t.raw) : undefined
    const via = dv?.candidates.map(c => ({ c, h: (data.search.map.get(key(c.form)) ?? [])[0] })).find(x => x.h && key(x.c.form) !== k)
    const dcard = via?.h && data.cards.get(via.h.lemma)
    if (dv && via && dcard) {
      const claims = claimsOf(dcard)
      out.push({ ...base, provenance: 'derived', derivedFrom: { form: via.c.form, trace: traceSteps(dv.norm, via.c.trace) }, status: 'attested', lemma: dcard.lemma, card: dcard,
        via: via.h!.via, claims, hints: [], mark: strongest(claims), epoch: shevEpochOf(dcard) })
      continue
    }
    const ruClass = data.ru && !a.known ? wordRules(t.raw, { known: knownKey, ru: data.ru }, { year }).ruClass : undefined   // MM-25 / MM-36: the shared rule function
    const contact = contactCorr(t.raw, f => hitsOf(data, f))   // MM-9: the SAME rule as MOR-ICHESK (core/rules.ts), so chip and counterpart agree
    out.push({ ...base, ...extra, status: a.known ? 'lexindex' : has ? 'rules' : 'unknown', claims: a.claims, hints: a.hints, vesum: a.vesum, lt: a.lt, mark: strongest(a.claims), ...(contact ? { contact } : {}), ...(ruClass ? { ruClass } : {}) })
  }
  return out
}

/**
 * SPEC 60 SX-4: multi-token spans (core/syntax.ts) over the whole text, with lexicon callbacks so that ambiguous endings
 * (feminine l-participle vs. noun in -ла, dative vs. genitive) are decided by VESUM tags / lemma POS, never guessed.
 */
export function annotateSyntax(text: string, data: LexData & Partial<AnnotateData>, year?: number): SyntaxSpan[] {
  const tagsOf = (k: string) => hitsOf(data, k).map(h => h.tags)
  const posOf = (k: string) => (data.search?.map.get(k) ?? []).map(h => data.cards?.get(h.lemma)?.pos ?? '')
  return detectSyntax(text, {
    year,
    isDative: k => { const t = tagsOf(k); return t.length ? t.some(x => x.includes('v_dav')) : undefined },
    verbness: k => {
      const t = [...tagsOf(k), ...posOf(k)]
      if (!t.length) return undefined
      return t.some(x => /verb|дієсл/.test(x)) ? 'verb' : 'other'
    },
    isKnown: k => (data.search?.map.has(k) ?? false) || tagsOf(k).length > 0,
  })
}

export interface Summary {
  total: number; linked: number; derived: number; pct: number
  byStatus: Record<Status, number>; byMark: Record<Category, number>
  epochProfile: Record<string, number>; unknown: string[]
}
export function summarize(tokens: AnnotatedToken[]): Summary {
  const byStatus: Summary['byStatus'] = { attested: 0, lexindex: 0, rules: 0, unknown: 0 }
  const byMark = { cs: 0, contact: 0, dialect: 0, rusyn: 0, colloquial: 0, archaic: 0 } as Summary['byMark']
  const lemmas = new Map<string, string>(), unknown = new Set<string>()
  let derived = 0
  for (const t of tokens) {
    if (t.numeral) continue   // a numeral is not a word: outside the coverage count
    if (t.provenance === 'derived') { derived++; continue }   // a hypothesis is not a corpus link
    byStatus[t.status]++
    if (t.mark) byMark[t.mark]++
    if (t.status === 'attested' && t.lemma && t.epoch) lemmas.set(t.lemma, t.epoch)
    if (t.status === 'unknown' || t.status === 'rules') unknown.add(t.key)
  }
  const epochProfile: Record<string, number> = {}
  for (const e of lemmas.values()) epochProfile[e] = (epochProfile[e] ?? 0) + 1
  const total = tokens.filter(t => !t.numeral).length
  return { total, linked: byStatus.attested, derived, pct: total ? byStatus.attested / total : 0, byStatus, byMark, epochProfile, unknown: [...unknown] }
}
