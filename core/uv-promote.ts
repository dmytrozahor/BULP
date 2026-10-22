/**
 * SPEC 63 CV-4 — promotion of an unlinked spelling group to an attested-only card «засвідчене слово, немає в словниках».
 * Pure (no node / DOM imports). core/uv.ts keeps every clean unlinked spelling as an «неперевірена лема» card; THIS file decides which of them have earned more:
 * the word is attested by at least two vetted witnesses (OQ: no gated OCR; typeset / proofread / manuscript sources), the spelling is not an OCR-garbage pattern,
 * not a proper name (a name that is in the name lexicon has an `n:` ref and never reaches the unlinked scan), not a fragment of a hyphenated known word, and has ≥ 3 letters.
 * No POS and no lemma are claimed: a card of this kind states only what the corpus shows.
 */
import { ZHEL_FOLDS } from './zhel-folds.ts'
import { ORTH1928_FOLDS } from './orth1928.ts'
import { GAL_FOLDS } from './gal-folds.ts'
import { modernize } from './modernize.ts'

export const UV_PROMOTE_MIN_W = 2
/** precision gate (measured on the live build, CV-4 hand check): of the first 50 sampled promotions with OCR-passing witnesses counted as full witnesses, 8 were OCR fragments (воф, змар, випр, анскую …), all of them seen only in unproofread archive.org OCR plus at most one real text. So OCR that passes OQ may add a KWIC line but never confirms a word alone: at least this many witnesses must be typeset / proofread / manuscript (witnessType other than `ocr`). */
export const UV_PROMOTE_MIN_STRONG = 2
export const UV_PROMOTE_MIN_LEN = 3
export const UV_PROMOTE_MAX_LEN = 24
/** statuses printed on the card (the line is «засвідчено N пам’ятками, у словниках немає») */
export const UV_ATTESTED_LABEL = 'засвідчене слово, немає в словниках'
export const uvAttestedLine = (nWitnesses: number): string => `засвідчено ${nWitnesses} пам’ятками, у словниках немає`

/** what the verdict needs to know about a witness (corpus.json record) */
export interface PromoteWitness { id: string; witnessType: string; /** OQ flag (core/ocr-quality.ts oqFlag): present = gated OCR */ oq?: unknown; noFreq?: boolean }
/** a witness that may confirm a word: not a dictionary (that is the DO / GG path), not attestation-only, and not gated OCR (OQ); manuscripts, editions and good OCR pass */
export const isVettedWitness = (w: PromoteWitness): boolean => w.witnessType !== 'dictionary' && !w.noFreq && !(w.witnessType === 'ocr' && !!w.oq)

const VOWELS = 'аеєиіїоуюяыѣѧѵѡѫэё'
const SERBIAN = /[ђћљњџѕјў]/
/** OCR-garbage pattern of a single spelling (its reason, or undefined when none matches): the digits / Latin / mixed script / ≥ 3 letters / repeated-single-letter tests of isCleanSpelling are done there */
export function garbageReason(raw: string): string | undefined {
  if (/\p{Ll}\p{Lu}/u.test(raw)) return 'mixed-case'
  const low = raw.toLowerCase(), letters = [...low.replace(/[^\p{L}]/gu, '')]
  if (letters.length < UV_PROMOTE_MIN_LEN) return 'short'
  if (letters.length > UV_PROMOTE_MAX_LEN) return 'long'
  if (/(\p{L})\1\1/u.test(low)) return 'letter-run'
  if (SERBIAN.test(low)) return 'foreign-letter'
  if (/^[-'’ʼъь]|[-'’ʼ]$|--|''|[-'’ʼ]{2}/u.test(low)) return 'edge-mark'
  if (letters.length >= 4 && !letters.some(c => VOWELS.includes(c))) return 'no-vowel'
  if (/[^аеєиіїоуюяыѣѧѵѡѫэёъьй'’ʼ\s-]{5}/u.test(low.replace(/[ъь]/g, ''))) return 'consonant-run'
  if (low.includes('-') && low.split('-').some(s => [...s].length < 2 && !['ж', 'б'].includes(s))) return 'hyphen-stub'
  return undefined
}

export interface PromoteSpelling { raw: string; count: number; /** occurrences that begin with a lower-case letter */ lower: number; /** occurrences that join with the neighbouring token into a known word (a line-break split) */ joins: number }
export interface PromoteInput { spellings: PromoteSpelling[]; /** every witness of the group, spelling by spelling in the same order */ witnesses: PromoteWitness[][] }
export interface PromoteVerdict { ok: boolean; why?: string; /** the vetted witnesses behind the card */ vetted?: string[] }

const spellingWhy = (s: PromoteSpelling): string | undefined => {
  const g = garbageReason(s.raw); if (g) return g
  if (s.lower === 0) return 'name'   // capitalised everywhere: a proper name or a heading, and the name lexicon (n: refs) already took the known ones
  if (s.joins * 2 >= s.count) return 'hyphen-split'
  return undefined
}
/** the promotion rule. The headword (the most frequent spelling = the first) must itself pass; spellings that fail are not counted, so a garbage variant never supplies a witness. */
export function promotionVerdict(i: PromoteInput): PromoteVerdict {
  const head = i.spellings[0]; if (!head) return { ok: false, why: 'empty' }
  const hw = spellingWhy(head); if (hw) return { ok: false, why: hw }
  const all = new Map<string, PromoteWitness>(), good = new Set<string>()
  i.spellings.forEach((s, n) => { for (const w of i.witnesses[n] ?? []) { all.set(w.id, w); if (!spellingWhy(s)) good.add(w.id) } })
  if ([...all.values()].some(w => w.witnessType === 'dictionary')) return { ok: false, why: 'dictionary-witness' }
  const vetted = [...good].filter(id => isVettedWitness(all.get(id)!))
  if (vetted.length < UV_PROMOTE_MIN_W) return { ok: false, why: vetted.length ? 'one-witness' : 'gated-ocr-only' }
  if (vetted.filter(id => all.get(id)!.witnessType !== 'ocr').length < UV_PROMOTE_MIN_STRONG) return { ok: false, why: 'ocr-weak' }
  return { ok: true, vetted }
}

/** the folds already tried by the linker (Желехівка, 1928, Galician, modernisation rules): a spelling that any single cited fold turns into a form `has` knows is a variant of a known word, not a new one */
export function foldsToKnown(raw: string, has: (form: string) => boolean): string | undefined {
  const low = raw.toLowerCase().normalize('NFC')
  for (const f of [...ZHEL_FOLDS, ...ORTH1928_FOLDS, ...GAL_FOLDS]) { const v = f.apply(low); if (v !== low && has(v)) return f.id }
  for (const m of modernize(low, has)) if (m.status === 'vesum') return m.steps[0]?.rule ?? 'MO'
  return undefined
}
