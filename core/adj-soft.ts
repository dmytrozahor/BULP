/**
 * SPEC 63 MM-6: Ukrainian soft-stem adjectives in -ній (давній, синій, літній, вечірній, пізній…).
 * VERIFIED against VESUM: давній is the only lemma (soft group: давнього, давньому, давня, давнє…); the hard stem «давний» is NOT a VESUM lemma, so the sound chain давьныи > давний
 * (R05 + R04 + R15) never reaches it. Whether an adjective in -н- belongs to the hard or the soft group is a property of the LEMMA (дрібний, давній are both < *-ьн-), and no source in the
 * project states a rule that predicts it (research/11 PAVL pp. 101–102 only give the two paradigms: «твердої групи» новꙑи, нового … and «м’якої групи» синии, синего …;
 * research/03 R05 gives добрыи > добрий, синии > синій). So this is NOT a sound rule. It is a labelled ALTERNATION CANDIDATE: the hard-group ending is also tried in the soft-group
 * form, with ONE extra branch, and it counts only if VESUM lists the result (VESUM decides, the plain chain wins any tie).
 * Why the POS gate blocked the card: the card's TOROT-less tokens carry a Stanza UPOS ADJ (gate key U:ADJ); the only ungated VESUM hit of «давна» is the archaic NOUN form давна,
 * which the ADJ gate rightly excludes, so the card was left unlinked and the reason said «POS gate». The card said «TOROT U:ADJ», but U: is the Stanza model (fixed: core/torot.ts gateSourceUk).
 */
import { P } from './evidence.ts'
import type { Fold } from './orthography.ts'
import type { Candidate } from './phonology.ts'

const SOFT_END: [string, string][] = [['ого', 'ього'], ['ому', 'ьому'], ['ими', 'іми'], ['ий', 'ій'], ['им', 'ім'], ['их', 'іх'], ['ою', 'ьою'], ['ої', 'ьої'], ['а', 'я'], ['у', 'ю'], ['е', 'є'], ['і', 'і']]
const SHAPE = new RegExp(`^(.{2,}н)(${SOFT_END.map(e => e[0]).join('|')})$`)
export function toSoftAdj(w: string): string {
  const m = SHAPE.exec(w); if (!m) return w
  return m[1]! + SOFT_END.find(e => e[0] === m[2])![1]
}
export const ADJ_SOFT_FOLD: Fold = {
  id: 'ORTH-ADJ-SOFT', era: [], branch: true,   // era [] = never applied by fold(); the build tries it as an extra candidate (withSoftAdj) and the trace resolves it by id
  cite: P('PAVL', 'Павленко 2010, с. 101–102 (research/11)', 'прикметники твердої групи (новꙑи, нового…) і м’якої групи (синии, синего…): два відмінювання; приналежність слова до групи — лексична', 'гіпотеза-чергування, не звукове правило; результат має бути формою ВЕСУМ'),
  apply: toSoftAdj,
}
/** extra soft-group candidates (one more branch each) after the plain ones */
export function withSoftAdj<T extends { candidates: Candidate[] }>(d: T): T {
  const seen = new Set(d.candidates.map(c => c.form)), extra: Candidate[] = []
  for (const c of d.candidates) {
    const s = toSoftAdj(c.form)
    if (s !== c.form && !seen.has(s)) { seen.add(s); extra.push({ form: s, trace: [...c.trace, ADJ_SOFT_FOLD.id], branches: c.branches + 1 }) }
  }
  return extra.length ? { ...d, candidates: [...d.candidates, ...extra] } : d
}
