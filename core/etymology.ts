/**
 * Etymology (SPEC 60 ET-1…ET-3; research/22). Pure: no node or DOM imports.
 *
 * > "Data model separating extracted dictionary content from later PROJECT hypotheses (`hypotheses[]` with author/status/evidence/date) …
 * >  automatic flag when corpus first attestation antedates/postdates dictionary dating." — research/22 U-22
 * > "ЕСУМ text is copyrighted print: do not bulk-harvest. Store only short quoted excerpts with citation and locator, and link to the mirror URL." — research/22 §3
 * > "Wiktionary (CC BY-SA) content is compatible only if ShareAlike and attribution are kept on the derived etymology field." — research/22 §3
 *
 * `sources` are the extracted dictionary statements (Evidence, verbatim); `hypotheses` are the project's own claims and never mix with them.
 * The conflict flag is a prompt for review: it corrects nothing and is never shown as a dictionary fact.
 */
import { Q, type Evidence } from './evidence.ts'
import { ukEtymEvidence, type UkEtym } from './etymuk.ts'

export interface EtymHypothesis { author: string; text: string; status: 'proposed' | 'accepted' | 'rejected'; evidence: Evidence[]; date: string }
export interface EtymStep { rel: string; text: string }   // rel: inh | der | bor | calque | sl …; text = Wiktionary's own expansion («Old East Slavic мѣ́сто (mě́sto)»)
/** BL-20 word-family edge: `basis` 'vesum' = visible in the VESUM entries (D), 'hypothesis' = project/user claim awaiting a dictionary quote (kept apart, never a fact) */
export interface FamilyLink { lemma: string; rel: string; basis: 'vesum' | 'hypothesis'; evidence: Evidence[]; inLexicon?: boolean }
export type EtymConflict = 'corpus-antedates' | 'corpus-postdates'
export interface Etymology {
  /** Evidence, kind Q: the Wiktionary etymology_text (CC BY-SA, attributed) and the ≤ 2-clause ЕСУМ quotation (goroh) */
  sources: Evidence[]
  /** the Wiktionary text itself (English prose), also contained in sources[0].quote when ≤ 300 chars */
  text: string
  chain?: EtymStep[]
  /** MM-22: aspect and partner(s) (Вікісловник, en) — the «видова пара» line of the card */
  aspect?: AspectPair
  /** GG-11: the «Етимологія» section of uk.wiktionary (CC BY-SA 4.0), a separate sourced block, never merged into `text`; its Evidence is in `sources` (source WIKTUK) */
  uk?: UkEtym
  hypotheses: EtymHypothesis[]
  family?: FamilyLink[]
  conflict?: EtymConflict
  conflictNote?: string
}
export interface EtymologyFile {
  format: 1; generated: string
  /** attribution that must travel with the data (CC BY-SA 4.0) */
  attribution: { wiktionary: string; licence: string; esum: string; kaikki: { file: string; sha256: string; extracted: string }; ukwikt?: { dump: string; date: string; licence: string } }
  entries: Record<string, Etymology>
}

export const goroh = (lemma: string) => `https://goroh.pp.ua/${encodeURIComponent('Етимологія')}/${encodeURIComponent(lemma)}`
export const wiktEn = (lemma: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(lemma)}#Ukrainian`
const clip = (s: string, n = 300) => (s.length <= n ? s : s.slice(0, n - 1) + '…')

/** Wiktionary etymology_text → Evidence (Q: the sentence is verbatim; clipped to the 300-char Evidence limit, the full text stays in Etymology.text). */
export const wiktEvidence = (lemma: string, text: string, extracted: string): Evidence =>
  Q('KAIKKI', wiktEn(lemma), clip(text.replace(/\s+/g, ' ').trim()), `Wiktionary (en), CC BY-SA 4.0, автори статті — на сторінці; витяг Wiktextract/kaikki.org ${extracted}`)
/** ЕСУМ via goroh: the first one or two clauses of the entry, verbatim, with the page URL as locator (print entry volume/page are not exposed by goroh, research/22 R2-A). */
export const esumEvidence = (lemma: string, quote: string): Evidence =>
  Q('ESUM', goroh(lemma), clip(quote), 'ЕСУМ за дзеркалом goroh.pp.ua; коротка цитата, повний текст — за посиланням; том і сторінку друкованого видання goroh не показує')

// ── dictionary dating (ET-3) ─────────────────────────────────────────────────────────────────────
export interface Dating { kind: 'attested' | 'borrowed'; from: number; to: number; quote: string }
const ORD = '(\\d{1,2})(?:st|nd|rd|th)(?:[ -]century|[ -]c\\.)'
const CENT = new RegExp(ORD, 'i'), YEAR_ATT = /\b(?:first\s+)?(?:attested|recorded|documented)\s+(?:in|since|from|by|already\s+in)\s+(?:the\s+)?(?:year\s+)?(1\d{3})\b/i
const ATT_CENT = new RegExp(`\\b(?:first\\s+)?(?:attested|recorded|documented)\\s+(?:in|since|from|by)\\s+(?:the\\s+)?(?:early\\s+|late\\s+|mid-?\\s*)?${ORD}`, 'i')
const BOR_CENT = new RegExp(`\\b(?:borrowed|loaned|adopted|introduced|calqued|entered)\\b[^.]{0,80}?\\b(?:in|during|since|by)\\s+(?:the\\s+)?(?:early\\s+|late\\s+|mid-?\\s*)?${ORD}`, 'i')
/**
 * The dating a dictionary states about the word, only when the text says so explicitly («first attested in 1627», «borrowed in the 17th century»).
 * Century N → [100(N−1)+1, 100N]. «Inherited from Old East Slavic» is NOT a dating: the Wiktionary chain gives no year.
 */
export function dictDating(text: string): Dating | undefined {
  const t = text.replace(/\s+/g, ' ')
  let m = YEAR_ATT.exec(t)
  if (m) return { kind: 'attested', from: +m[1]!, to: +m[1]!, quote: m[0] }
  m = ATT_CENT.exec(t)
  if (m) { const c = +m[1]!; return { kind: 'attested', from: 100 * (c - 1) + 1, to: 100 * c, quote: m[0] } }
  m = BOR_CENT.exec(t)
  if (m) { const c = +m[1]!; return { kind: 'borrowed', from: 100 * (c - 1) + 1, to: 100 * c, quote: m[0] } }
  return undefined
}

/**
 * ET-3: our first attestation `corpus` ([from,to] of the earliest witness) against the dictionary dating.
 * corpus-antedates: the corpus word is attested before the dictionary's earliest date (our witness ends before the dictionary period begins).
 * corpus-postdates: the dictionary says «attested» earlier than any witness of ours (our earliest witness starts after the dictionary period ends) — expected for a thin corpus, so it is only a review prompt.
 */
export function etymConflict(d: Dating | undefined, corpus: [number, number] | undefined): { conflict: EtymConflict; note: string } | undefined {
  if (!d || !corpus) return undefined
  if (corpus[1] < d.from) return { conflict: 'corpus-antedates', note: `словник: «${d.quote}» (${d.from}–${d.to}); перша фіксація в корпусі: ${corpus[0] === corpus[1] ? corpus[0] : corpus.join('–')}` }
  if (d.kind === 'attested' && corpus[0] > d.to) return { conflict: 'corpus-postdates', note: `словник: «${d.quote}» (${d.from}–${d.to}); перша фіксація в корпусі лише ${corpus[0] === corpus[1] ? corpus[0] : corpus.join('–')}` }
  return undefined
}

// ── assembly ─────────────────────────────────────────────────────────────────────────────────────
/** MM-22: the aspect of a verb and its partner(s), from the en.wiktionary headword line «прийня́ти (pryjnjáty) pf (imperfective прийма́ти)» (kaikki head_templates[].expansion) */
export interface AspectPair { asp: 'pf' | 'impf'; partner: string[] }
export interface KaikkiRec { text: string; chain?: EtymStep[]; aspect?: AspectPair }
const ACUTE = /́/g
export function aspectOf(expansions: (string | undefined)[]): AspectPair | undefined {
  for (const x of expansions) {
    const m = /\b(pf|impf)\b[^()]*\((?:imperfective|perfective)\s+([^)]+)\)/.exec((x ?? '').normalize('NFC'))
    if (m) return { asp: m[1] as 'pf' | 'impf', partner: m[2]!.split(',').map(s => s.replace(ACUTE, '').trim()).filter(Boolean) }
  }
  return undefined
}
/** MM-12: kaikki puts «See the etymology of the corresponding lemma form.» on every form-of entry (a plural, a case form …); that sentence is a pointer, not an etymology. It is removed
 *  (with whatever follows it, e.g. «By surface analysis, …», kept as the text); an entry with nothing else left has no etymology of its own. */
export const FORM_OF_ETYM = /^See the etymology of the corresponding lemma form\.*\s*/i
export function withoutFormOf(k: KaikkiRec | undefined): KaikkiRec | undefined {
  if (!k || !FORM_OF_ETYM.test(k.text)) return k
  const text = k.text.replace(FORM_OF_ETYM, '').trim()
  return text ? { ...k, text } : undefined   // (the aspect of a form-of entry is the lemma's business: dropped with the pointer)
}
export function buildEtymology(lemma: string, k0: KaikkiRec | undefined, esumQuote: string | undefined, hyps: EtymHypothesis[], corpusFirst: [number, number] | undefined, extracted: string, family: FamilyLink[] = [], uk?: UkEtym, ukDump = ''): Etymology | undefined {
  const k = withoutFormOf(k0)
  if (!k && !esumQuote && !uk && !hyps.length && !family.length && !k0?.aspect) return undefined
  const sources: Evidence[] = []
  if (k && k.text) sources.push(wiktEvidence(lemma, k.text, extracted))
  if (esumQuote) sources.push(esumEvidence(lemma, esumQuote))
  if (uk) sources.push(ukEtymEvidence(lemma, uk, ukDump))
  const e: Etymology = { sources, text: k?.text ?? '', ...(uk ? { uk } : {}), hypotheses: hyps, ...(family.length ? { family } : {}), ...(k?.chain?.length ? { chain: k.chain } : {}), ...((k ?? k0)?.aspect ? { aspect: (k ?? k0)!.aspect } : {}) }
  const c = k ? etymConflict(dictDating(k.text), corpusFirst) : undefined
  if (c) { e.conflict = c.conflict; e.conflictNote = c.note }
  return e
}

export const LANG_UK: Record<string, string> = { inh: 'успадковано', der: 'походить від', bor: 'запозичено з', 'bor+': 'запозичено з', lbor: 'навчене запозичення з', calque: 'калька з', cal: 'калька з', sl: 'семантична калька з', slb: 'семантичне запозичення з', obor: 'орфографічне запозичення з', uder: 'походить від' }
export const CONFLICT_UK: Record<EtymConflict, string> = {
  'corpus-antedates': 'корпус старший за датування словника — перевірити (можливо, словник запізнюється або свідок датований хибно)',
  'corpus-postdates': 'словник називає давнішу фіксацію, ніж маємо в корпусі — звичайно через малий корпус; лише для перегляду',
}
