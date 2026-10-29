/**
 * SPEC 63 PV: TOROT/PROIEL gold annotation as the primary analysis of Old East Slavic witnesses. Pure (no node/DOM imports).
 *
 * > "Make better extraction for повість врем'яних літ" — user, 2026-10-14 (lav witness page, most words unlinked)
 * > <parts-of-speech> «Ne» = «proper noun»; «Nb» = «common noun» — TOROT lav.xml header (PROIEL schema 2.0)
 *
 * A TOROT lemma is EVIDENCE, never a modern lemma: a token links to modern Ukrainian only through VESUM-attested fold/derivation candidates (build-link.ts).
 * Tokens that do not link get a typed fallback card instead of staying plain text: Ne → `name` card (/name/:id), other lemma → ORV-only card (/orv/:id).
 * Orthographic folds (ѿ→от, ѡ→о, ѧ/ꙗ, ѫ, ѣ, ъ …) are NOT re-implemented: core/text.ts normalizeOld N03/N07 + core/phonology.ts derive are reused as they are.
 */
import { placeOf } from './places.ts'

/** TOROT part-of-speech tags, verbatim `summary` of lav.xml <parts-of-speech> */
export const TOROT_POS: Record<string, string> = {
  'A-': 'adjective', Df: 'adverb', 'S-': 'article', Ma: 'cardinal numeral', Nb: 'common noun', 'C-': 'conjunction', Pd: 'demonstrative pronoun', 'F-': 'foreign word',
  Px: 'indefinite pronoun', 'N-': 'infinitive marker', 'I-': 'interjection', Du: 'interrogative adverb', Pi: 'interrogative pronoun', Mo: 'ordinal numeral',
  Pp: 'personal pronoun', Pk: 'personal reflexive pronoun', Ps: 'possessive pronoun', Pt: 'possessive reflexive pronoun', 'R-': 'preposition', Ne: 'proper noun',
  Py: 'quantifier', Pc: 'reciprocal pronoun', Dq: 'relative adverb', Pr: 'relative pronoun', 'G-': 'subjunction', 'V-': 'verb', 'X-': 'unassigned',
}
/** morph string of the ingester = `${pos} ${morphology}` */
export const posOf = (morph?: string) => (morph ?? '').split(' ')[0] ?? ''
export const isName = (morph?: string) => posOf(morph) === 'Ne' || posOf(morph) === 'PROPN'   // PROPN = Stanza ORV (PV-8, model output)
export const torotId = (lemma: string) => lemma.normalize('NFC').toLowerCase()

export type Bucket = 'linked' | 'name' | 'orv' | 'none'
/** PV-3/PV-5: a proper name is a name (even when VESUM also links it); a lemma that did not link is ORV-only; no TOROT lemma → none. */
/** MM-26: a MODEL (Stanza) PROPN on a lower-case token is no proper name (Острозька епіграма 1581: «николы» = ніколи, not Никола); the model's name tag counts only for a capitalised token.
 *  TOROT gold Ne tags are kept as they are (OES manuscripts write names in lower case). */
const lowerInitial = (raw?: string) => !!raw && raw[0] === raw[0]!.toLowerCase() && raw[0] !== raw[0]!.toUpperCase()
export const bucketOf = (t: { lemma?: string; morph?: string; raw?: string }, linked: boolean, model = false): Bucket =>
  !t.lemma ? (linked ? 'linked' : 'none') : isName(t.morph) && !(model && lowerInitial(t.raw)) ? 'name' : linked ? 'linked' : 'orv'

/** MM-5: how a card's lemma / POS / morphology are labelled. Stanza ORV output (card.model, a token gate key `U:…`) is a model prediction, never TOROT gold. */
export const MODEL_NOTE = 'автоматична розмітка (Stanza), не перевірено'
export const MODEL_POS_SUFFIX = ' (Stanza ORV, модель)'
/** `pos` without the internal model suffix */
export const posShown = (c: { pos: string }) => c.pos.endsWith(MODEL_POS_SUFFIX) ? c.pos.slice(0, -MODEL_POS_SUFFIX.length) : c.pos
/** the line «TOROT: VERB …» is only for gold annotation; a model card says what it is */
export const tagLine = (c: { model?: true; pos: string; morph: string }): { source: 'TOROT' | 'Stanza'; text: string } =>
  c.model ? { source: 'Stanza', text: `${MODEL_NOTE}: ${posShown(c)}${c.morph ? ' ' + c.morph : ''}` } : { source: 'TOROT', text: `TOROT: ${c.pos}${c.morph ? ' ' + c.morph : ''}` }
/** POS-gate keys: `P:` = TOROT manual tag, `U:` = Stanza UPOS (model); the card's reason names the right source */
export const gateSourceUk = (gate: string | undefined) => (gate?.startsWith('U:') ? 'Stanza, модель' : 'TOROT')

export interface TorotEvidence { w: string; loc: string; raw: string; morph: string }
export interface TorotForm { raw: string; f: number }
interface CardBase { /** PV-8: true when lemma/POS/morphology are Stanza ORV model output, not TOROT gold */ model?: true; id: string; lemma: string; pos: string; morph: string; n: number; forms: TorotForm[]; evidence: TorotEvidence[] }
export interface NameCard extends CardBase {
  /** `place` only when the cited gazetteer (core/places.ts, Wikidata) knows the stem; TOROT Ne does not say person/place/people → `unknown` (SPEC 00) */
  kind: 'place' | 'unknown'; place?: string
  /** modern Ukrainian form: only when the token also linked to a VESUM proper-noun lemma */
  modern?: string
  /** SPEC 63 MU-3: no TOROT annotation; the card rests on capitalisation alone (capNames in build-torot.ts) */
  basis?: 'capitalisation'
}
/** MM-28: the rule-derived modern form is a headword of a held dictionary (СУМ-11 / СУМ-20 …): dictionary id, locator (т. / с.), gloss ≤ 200 characters */
export interface DictModern { form: string; dict: string; loc: string; q: string }
export interface OrvCard extends CardBase { gloss: 'unknown'; reason: string; dictModern?: DictModern }
export interface TorotFile { generated: string; source: string; names: NameCard[]; orv: OrvCard[] }

export class TorotScan {
  readonly names = new Map<string, NameCard>(); readonly orv = new Map<string, OrvCard>()
  add(b: Bucket, w: string, t: { raw: string; lemma?: string; morph?: string; loc: string }, extra: { modern?: string; reason?: string; model?: boolean } = {}): string | undefined {
    if ((b !== 'name' && b !== 'orv') || !t.lemma) return undefined
    const id = torotId(t.lemma), m = (b === 'name' ? this.names : this.orv) as Map<string, CardBase>
    let c = m.get(id)
    if (!c) {
      const pos = posOf(t.morph)
      const base: CardBase = { ...(extra.model ? { model: true as const } : {}), id, lemma: t.lemma, pos: extra.model ? `${pos} (Stanza ORV, модель)` : `${pos} ${TOROT_POS[pos] ?? ''}`.trim(), morph: (t.morph ?? '').split(' ').slice(1).join(' '), n: 0, forms: [], evidence: [] }
      c = b === 'name'
        ? ((): NameCard => { const p = placeOf(t.raw.charAt(0).toUpperCase() + t.raw.slice(1)); return { ...base, kind: p ? 'place' : 'unknown', ...(p ? { place: p.id } : {}) } })()
        : { ...base, gloss: 'unknown', reason: extra.reason ?? 'unknown' } as OrvCard
      m.set(id, c)
    }
    c.n++
    const f = c.forms.find(x => x.raw === t.raw); f ? f.f++ : c.forms.push({ raw: t.raw, f: 1 })
    if (c.evidence.length < 3 && !c.evidence.some(e => e.raw === t.raw)) c.evidence.push({ w, loc: t.loc, raw: t.raw, morph: t.morph ?? '' })
    if (b === 'name' && extra.modern && !(c as NameCard).modern) (c as NameCard).modern = extra.modern
    return (b === 'name' ? 'n:' : 'o:') + id
  }
  file(generated: string): TorotFile {
    const byN = <T extends { n: number; id: string }>(a: T[]) => a.sort((x, y) => y.n - x.n || x.id.localeCompare(y.id))
    for (const c of [...this.names.values(), ...this.orv.values()]) c.forms.sort((a, b) => b.f - a.f)
    return { generated, source: 'TOROT treebank-releases (PROIEL XML), CC BY-NC-SA 3.0; lemma / part-of-speech / morphology / citation-part per token', names: byN([...this.names.values()]), orv: byN([...this.orv.values()]) }
  }
}
