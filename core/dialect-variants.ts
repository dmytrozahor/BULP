/**
 * SPEC 63 DV-1 — dialect variants of standard words, found in bulk in OUR data (the unlinked corpus vocabulary) instead of one word at a time.
 * Pure (no node / DOM imports). Three methods, in descending evidence; each result carries its method and its grade, and the grade is the only thing a card may claim:
 *   1 dict        a dialect dictionary headword whose gloss is ONE standard word of the same POS (or «те саме, що»): grade `dict` + the dictionary's area, locator, quote. A CR-1 pair, automatic.
 *   2 rule        a CITED fold (core/gal-*.ts, zhel-folds.ts, orth1928.ts …) applied to an unlinked token, the target confirmed by VESUM with the tag the fold expects. Existing mechanism, grade as the fold's cite.
 *   3 hypothesis  a systematic correspondence the DATA shows (DV_RULES below), target a normative VESUM form of the expected POS, regional skew as support. Grade `гіпотеза`, never presented as fact,
 *                 never counted as a link in the corpus counts, never merges two lexemes (кит / кіт guard), a form VESUM knows is never redirected. Only the rules whose hand-checked precision is
 *                 ≥ 80 % (DV_SHIPPED) are shipped as hypotheses; the others are listed in analysis/dialect-variants-review.md.
 * Owner confirmations: data/owner/variants-confirmed.tsv (a confirmed line becomes an owner-graded row, evidence kind P «за свідченням носія»), data/owner/variants-rejected.tsv (a rejected line never reappears).
 */
import { P, type Evidence } from './evidence.ts'

export type DvMethod = 'dict' | 'rule' | 'hypothesis' | 'owner'
export type DvGrade = 'dict' | 'rule' | 'hyp' | 'owner'
export const DV_GRADE_UK: Record<DvGrade, string> = { dict: 'за словником', rule: 'за правилом із джерелом', hyp: 'гіпотеза', owner: 'за свідченням носія' }
export const DV_HYP_NOTE = 'гіпотеза: збіг за системним відповідником і розподілом у корпусі, словникового підтвердження немає; не зараховується до лічильників'
export const DV_MIN = { f: 5, witnesses: 2 } as const
/** a hypothesis is shown only when the correspondence was hand-checked at this precision (SPEC 63 DV-1) */
export const DV_SHIP_PRECISION = 0.8

// ── systematic correspondences (dialect form → standard candidates) ──────────────────────────────────────────────────
export interface DvRule {
  id: string; name: string
  /** the standard-side spellings that the dialect spelling `w` may come from (reverse direction), without the identity */
  gen: (w: string) => string[]
  /** a change that is also a pair of different words (кит / кіт): the rule is never offered for a token with such a neighbour that VESUM lists with the same POS */
  note: string
  /** the target must have one of these VESUM classes (єк- is a pronoun / conjunction: єкорі is not якорі) */ pos?: string[]
}
/** every single replacement of `re`'s first group (and all of them at once) */
export function subs(w: string, from: string, to: string, at: 'any' | 'init' | 'final' = 'any'): string[] {
  const out = new Set<string>()
  const idx: number[] = []
  for (let i = w.indexOf(from); i >= 0; i = w.indexOf(from, i + 1)) {
    if (at === 'init' && i !== 0) continue
    if (at === 'final' && i + from.length !== w.length) continue
    idx.push(i)
  }
  for (const i of idx) out.add(w.slice(0, i) + to + w.slice(i + from.length))
  if (idx.length > 1) out.add(idx.reduceRight((s, i) => s.slice(0, i) + to + s.slice(i + from.length), w))
  out.delete(w)
  return [...out]
}
const many = (w: string, pairs: [string, string, ('any' | 'init' | 'final')?][]): string[] => [...new Set(pairs.flatMap(([a, b, at]) => subs(w, a, b, at ?? 'any')))]

/** Candidate correspondences. Each is applied to an UNLINKED spelling; the target must be a normative VESUM form (core/dialect-variants.ts hypothesisOk). Precision = hand check of random hits (analysis/dialect-variants-review.md). */
export const DV_RULES: DvRule[] = [
  { id: "DV-SHCH", name: "шч ~ щ (шчо ~ що, ішче ~ іще, дошч ~ дощ)", gen: w => many(w, [["шч", "щ"]]), note: "галицьке шч на місці щ" },
  { id: "DV-JE-JA-END", name: "-єм / -єх / -єми ~ -ям / -ях / -ями (людєх ~ людях, повітрєм ~ повітрям)", gen: w => (/[бвгґджзклмнпрстфхцчшщ]є(?:м|х|ми)$/.test(w) ? many(w, [["єм", "ям", "final"], ["єх", "ях", "final"], ["єми", "ями", "final"]]) : []), note: "м’який кінцевий склад іменника (Желехівка, галицькі та поліські говірки)" },
  { id: "DV-JE-JA-INIT", name: "єк- ~ як- (єкий ~ який, єк ~ як)", gen: w => (/^єк/.test(w) ? ["я" + w.slice(1)] : []), note: "початкове є- на місці я-", pos: ["pron", "conj", "adv"] },
  { id: "DV-CHOT-SHT", name: "шти- ~ чоти- (штири ~ чотири, штирьох ~ чотирьох)", gen: w => (/^шт[иеє]р/.test(w) ? ["чотир" + w.slice(4)] : []), note: "числівник чотири, усі відмінки" },
]
/** measured and NOT shipped (hand check below 80 %, or noise of Russian orthography and OCR): kept so the review can list their precision */
export const DV_EXPLORED: DvRule[] = [
  { id: "DV-JE-T", name: "-єт ~ -ить (мусєт ~ мусить)", gen: w => many(w, [["єт", "ить", "final"], ["єт", "іть", "final"]]), note: "совєт ~ совіть: збіг із російським «совет»" },
  { id: "DV-JE-O-INIT", name: "єд- ~ од- (єден ~ один)", gen: w => (/^єд/.test(w) ? ["од" + w.slice(2), "оди" + w.slice(3)].filter(x => x !== w) : []), note: "єден — у словнику й у родині; у непізнаних написаннях лише шум (єдуру ~ одуру)" },
  { id: "DV-JE-JA", name: "є ~ я (будь-де)", gen: w => many(w, [["є", "я"]]), note: "" },
  { id: "DV-JE-O", name: "є ~ о (будь-де)", gen: w => many(w, [["є", "о"]]), note: "єтого = этого: російське правопис" },
  { id: "DV-JE-I", name: "є ~ і", gen: w => many(w, [["є", "і"]]), note: "" },
  { id: "DV-DZ-Z", name: "дз ~ з (дзелений ~ зелений)", gen: w => many(w, [["дз", "з"]]), note: "лемківське / бойківське дз; дзе = де дає шум" },
  { id: "DV-T-TJ", name: "-т ~ -ть / -ти", gen: w => many(w, [["т", "ть", "final"], ["т", "ти", "final"]]), note: "уламки інфінітивів" },
  { id: "DV-L-LJ", name: "л ~ ль", gen: w => many(w, [["л", "ль"]]), note: "польське та російське правопис" },
  { id: "DV-JA-JE", name: "я ~ е", gen: w => many(w, [["я", "е"]]), note: "-ня на місці -ння" },
  { id: "DV-V-U", name: "в ~ у", gen: w => many(w, [["в", "у"]]), note: "шум OCR" },
]
/** hand-check results (n checked, c correct), by the author of this change on 30–35 random single-rule hits per rule; rules not listed were checked on fewer than 20 hits */
export const DV_PRECISION: Record<string, { n: number; c: number }> = {
  "DV-SHCH": { n: 36, c: 35 }, "DV-JE-JA-END": { n: 50, c: 50 }, "DV-JE-JA-INIT": { n: 10, c: 10 }, "DV-CHOT-SHT": { n: 2, c: 2 },   // JE-JA-INIT and CHOT-SHT: the whole population (10 and 2 types), not a sample
  "DV-JE-JA": { n: 35, c: 24 }, "DV-JE-O": { n: 35, c: 4 }, "DV-JE-O-INIT": { n: 9, c: 2 }, "DV-JE-T": { n: 2, c: 0 }, "DV-JE-I": { n: 35, c: 14 }, "DV-DZ-Z": { n: 30, c: 12 }, "DV-T-TJ": { n: 30, c: 2 }, "DV-L-LJ": { n: 30, c: 14 }, "DV-JA-JE": { n: 30, c: 2 }, "DV-V-U": { n: 30, c: 0 },
}
export const dvRuleById = Object.fromEntries([...DV_RULES, ...DV_EXPLORED].map(r => [r.id, r])) as Record<string, DvRule>

// ── guards ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const swapKey = (w: string): string => w.replace(/[иіїы]/g, 'и')
/** кит / кіт: a pair that differs only by an и / і / ї / ы swap is two lexemes, never a dialect variant */
export const isSwapPair = (a: string, b: string): boolean => swapKey(a) === swapKey(b)
/** an obvious OCR / noise pattern of a spelling (a shorter list than core/uv-promote garbageReason, which the scan also applies) */
export const DV_MIN_LEN = 3

// ── one result ────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface DvLink {
  /** the unlinked corpus spelling (lower case, no stress) */ form: string
  /** the standard lemma (or the standard form for method 3) */ target: string
  method: DvMethod; grade: DvGrade
  /** rule / fold id for 2 and 3, source id for 1 */ via: string
  /** VESUM POS class of the target */ pos?: string
  /** tokens in the corpus, witnesses */ f: number; nW: number
  /** dictionary area (method 1), as the source names it */ area?: string
  /** locator + quote of the source (method 1) */ loc?: string; q?: string
  /** regional skew: [region, tokens] by tokens desc (method 3, supporting evidence only) */ regions?: [string, number][]
}

// ── owner confirmations (data/owner/variants-confirmed.tsv, variants-rejected.tsv) ───────────────────────────────────────
/** form <TAB> standard lemma <TAB> dialect / area (may be empty) <TAB> owner's remark (optional). Lines starting with # and empty lines are ignored. */
export interface OwnerRow { form: string; target: string; area: string; remark: string }
export function parseOwnerTsv(text: string): OwnerRow[] {
  const out: OwnerRow[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue
    const [form, target, area = '', remark = ''] = line.split('\t').map(s => s.trim())
    if (!form || !target) continue
    out.push({ form: form.normalize('NFC').toLowerCase(), target: target.normalize('NFC').toLowerCase(), area, remark })
  }
  return out
}
export const OWNER_TSV_HEADER = '# форма\tстандартне слово\tговір / область (можна порожнє)\tзауваження носія (можна порожнє)\n'
export const ownerPairKey = (form: string, target: string): string => `${form.normalize('NFC').toLowerCase()}\u0001${target.normalize('NFC').toLowerCase()}`
/** the owner's confirmation as evidence of kind P («за свідченням носія») */
export const ownerEvidence = (r: OwnerRow): Evidence =>
  P('зауваження власника', 'data/owner/variants-confirmed.tsv', r.remark || `${r.form} → ${r.target}`, `ступінь: за свідченням носія${r.area ? `; ${r.area}` : ''}; джерела, окрім свідчення носія, не вказано`)
/** drop the lines the owner rejected (they never reappear in the review file or in the data) */
export function withoutRejected<T extends { form: string; target: string }>(rows: T[], rejected: OwnerRow[]): T[] {
  const bad = new Set(rejected.map(r => ownerPairKey(r.form, r.target)))
  return rows.filter(r => !bad.has(ownerPairKey(r.form, r.target)))
}

// ── the hypothesis gate ───────────────────────────────────────────────────────────────────────────────────────────────
export interface HypCandidate { form: string; f: number; nW: number; vesumKnown: boolean; targetNormative: boolean; targetPos: string[]; target: string; ruleId: string }
/** may this candidate be offered as a hypothesis? (VESUM-known forms are never redirected; the target must be a normative VESUM form; not a swap pair; frequency floor) */
export function hypothesisOk(c: HypCandidate, shipped: ReadonlySet<string>): { ok: boolean; why?: string } {
  if (c.vesumKnown) return { ok: false, why: 'VESUM knows the form' }
  if (!c.targetNormative) return { ok: false, why: 'target not normative' }
  if (isSwapPair(c.form, c.target)) return { ok: false, why: 'и/і swap' }
  if (c.f < DV_MIN.f || c.nW < DV_MIN.witnesses) return { ok: false, why: 'below f / witnesses' }
  if ([...c.form].length < DV_MIN_LEN) return { ok: false, why: 'too short' }
  if (!shipped.has(c.ruleId)) return { ok: false, why: 'rule below 80 % precision' }
  return { ok: true }
}

// ── dictionary side (method 1) ────────────────────────────────────────────────────────────────────────────────────────
/** a dictionary gloss that names ONE standard word: «чотири», «Те саме, що чотири» */
export function singleGloss(g: string): string | undefined {
  const s = g.normalize('NFC').replace(/[….;]+$/g, '').trim().toLowerCase()
  const m = /^(?:те саме,?\s+що|те саме як|=)\s+([а-яіїєґ'’ʼ-]+)$/u.exec(s)
  const w = m ? m[1]! : s
  return /^[а-яіїєґ]+(?:['’ʼ-][а-яіїєґ]+)*$/u.test(w) && w.length >= 2 ? w.replace(/[’ʼ]/g, "'") : undefined
}
