/**
 * SPEC 61 FX-1: part-of-speech compatibility gate for linking (SPEC 20 B-2). A link of a historical token to a VESUM lemma is accepted only if the POS of the token's own
 * annotation (TOROT/PROIEL tag, or Stanza UPOS) is compatible with the POS class of the VESUM analysis. Pure: shared by the build and the tests.
 *
 * Three vocabularies, each cited from its own documentation:
 *  - PROIEL/TOROT `parts-of-speech` header of the TOROT XML (data/raw/torot/ostromir/000.xml, <parts-of-speech>): the `summary` strings below are verbatim.
 *  - Universal Dependencies UPOS (https://universaldependencies.org/u/pos/): the one-line names below are verbatim.
 *  - VESUM tag POS (dict_uk doc/tags.txt, research/02 §2): first tag segment `noun verb adj adv advp prep conj part intj numr noninfl onomat adjp` + the
 *    segment `pron` on pronouns (real data: `я noun:anim:s:v_naz:pron:pers:1`, `цього adj:m:v_rod:pron:dem`; the older `&pron` spelling is accepted too).
 * The mapping PROIEL ↔ UD ↔ VESUM is ours (a coarse class table); the vocabularies' own names are the evidence for each row, and the table is deliberately
 * LENIENT where grammars legitimately differ (a TOROT adjective used as VESUM participle; a quantifier that VESUM calls a numeral or an adverb) and STRICT where
 * the classes cannot overlap (a pronoun, conjunction, particle or preposition never links to a VESUM common noun).
 */

/** Coarse POS class of a VESUM analysis (tags verbatim in, class out). `pron` wins over noun/adj: VESUM marks pronouns with an extra `pron` tag segment. */
export type VClass = 'noun' | 'pron' | 'adj' | 'adjp' | 'verb' | 'advp' | 'adv' | 'prep' | 'conj' | 'part' | 'intj' | 'numr' | 'noninfl' | 'onomat' | 'predic' | 'insert' | 'other'
const VCLASSES = new Set(['noun', 'adj', 'adjp', 'verb', 'advp', 'adv', 'prep', 'conj', 'part', 'intj', 'numr', 'noninfl', 'onomat', 'predic', 'insert'])
export function vesumClass(tags: string): VClass {
  const t = tags.split(':'), head = t[0] ?? ''
  if ((head === 'noun' || head === 'adj' || head === 'numr' || head === 'adv') && (t.includes('pron') || t.includes('&pron'))) return 'pron'
  return VCLASSES.has(head) ? head as VClass : 'other'
}
export const isPronTags = (tags: string) => vesumClass(tags) === 'pron'

/** Source-side key: `P:<PROIEL tag>` (TokenRec.morph starts with it) or `U:<UPOS>`. */
export interface GateRow { key: string; cite: string; allow: readonly VClass[] }
const PRON: VClass[] = ['pron']
const NOM: VClass[] = ['noun', 'adj', 'adjp']
const FUNC: VClass[] = ['adv', 'conj', 'part', 'prep', 'intj', 'noninfl', 'predic', 'insert', 'onomat']
const P = (tag: string, summary: string, allow: readonly VClass[]): GateRow => ({ key: 'P:' + tag, cite: `TOROT parts-of-speech «${tag}» = «${summary}»`, allow })
const U = (tag: string, name: string, allow: readonly VClass[]): GateRow => ({ key: 'U:' + tag, cite: `UD UPOS ${tag} = «${name}» (universaldependencies.org/u/pos/)`, allow })

export const GATE: GateRow[] = [
  P('Nb', 'common noun', NOM), P('Ne', 'proper noun', NOM),
  P('A-', 'adjective', ['adj', 'adjp', 'pron', 'numr', 'adv']),
  P('Ma', 'cardinal numeral', ['numr', 'noun', 'adj', 'adv']), P('Mo', 'ordinal numeral', ['numr', 'adj']),
  P('Pp', 'personal pronoun', ['pron', 'part']), P('Pk', 'personal reflexive pronoun', ['pron', 'part']),
  P('Ps', 'possessive pronoun', ['pron', 'adj']), P('Pt', 'possessive reflexive pronoun', ['pron', 'adj']),
  P('Pd', 'demonstrative pronoun', ['pron', 'adj', 'adv', 'part', 'noninfl']), P('Pr', 'relative pronoun', ['pron', 'adj', 'conj', 'adv', 'numr', 'noninfl']),
  P('Pi', 'interrogative pronoun', ['pron', 'adj', 'adv', 'conj', 'part', 'numr', 'noninfl']), P('Px', 'indefinite pronoun', ['pron', 'adj', 'numr', 'adv', 'part', 'noninfl']),
  P('Pc', 'reciprocal pronoun', ['pron', 'adj']), P('Py', 'quantifier', ['pron', 'adj', 'numr', 'adv']),
  P('V-', 'verb', ['verb', 'adjp', 'advp', 'adj', 'predic']),
  P('Df', 'adverb', [...FUNC, 'numr']), P('Dq', 'relative adverb', [...FUNC, 'numr']), P('Du', 'interrogative adverb', [...FUNC, 'numr']),
  P('C-', 'conjunction', ['conj', 'part', 'adv', 'prep', 'noninfl', 'intj', 'predic', 'insert']),
  P('G-', 'subjunction', ['conj', 'part', 'adv', 'prep', 'noninfl', 'pron', 'predic', 'insert']),
  P('R-', 'preposition', ['prep', 'adv', 'noninfl', 'conj', 'part']),
  P('I-', 'interjection', ['intj', 'part', 'noninfl', 'onomat', 'adv']),
  P('N-', 'infinitive marker', ['part', 'noninfl', 'verb']), P('S-', 'article', ['pron', 'part']),
  U('NOUN', 'noun', NOM), U('PROPN', 'proper noun', NOM), U('ADJ', 'adjective', ['adj', 'adjp', 'pron', 'numr', 'adv']),
  U('PRON', 'pronoun', ['pron', 'adj', 'numr', 'adv', 'part', 'noninfl']), U('DET', 'determiner', ['pron', 'adj', 'numr', 'adv']),
  U('NUM', 'numeral', ['numr', 'noun', 'adj', 'adv']), U('VERB', 'verb', ['verb', 'adjp', 'advp', 'adj', 'predic']), U('AUX', 'auxiliary', ['verb', 'adjp', 'advp', 'part', 'predic']),
  U('ADV', 'adverb', [...FUNC, 'numr']), U('ADP', 'adposition', ['prep', 'adv', 'noninfl', 'conj', 'part']),
  U('CCONJ', 'coordinating conjunction', ['conj', 'part', 'adv', 'prep', 'noninfl', 'intj', 'predic', 'insert']),
  U('SCONJ', 'subordinating conjunction', ['conj', 'part', 'adv', 'prep', 'noninfl', 'pron', 'predic', 'insert']),
  U('PART', 'particle', ['part', 'conj', 'adv', 'intj', 'noninfl', 'predic', 'insert', 'prep']), U('INTJ', 'interjection', ['intj', 'part', 'noninfl', 'onomat', 'adv']),
]
export const GATE_BY_KEY = new Map(GATE.map(r => [r.key, r]))
void PRON

/** Gate key of a token from its own annotation: TOROT morph (manual) first, else Stanza UPOS (model, P-1.7). `undefined` = F-, X-, PUNCT, X … → no gate. */
export function gateKey(morph?: string, upos?: string): string | undefined {
  const p = morph?.trim().split(/\s+/)[0]
  if (p && GATE_BY_KEY.has('P:' + p)) return 'P:' + p
  if (!p && upos && GATE_BY_KEY.has('U:' + upos)) return 'U:' + upos
  return undefined
}
/** FX-1: is a VESUM analysis (tags) compatible with the token's gate key? No key = compatible. */
export function compatible(gate: string | undefined, vesumTags: string): boolean {
  if (!gate) return true
  const row = GATE_BY_KEY.get(gate)
  return !row || row.allow.includes(vesumClass(vesumTags))
}

/** FX-5 data side: the paradigm kind of a lemma by its VESUM lemma-line tags. */
export type ParadigmKind = 'noun' | 'pron' | 'adj' | 'verb' | 'numr' | 'uninflected'
export function paradigmKindOf(tags: string): ParadigmKind {
  switch (vesumClass(tags)) {
    case 'noun': return 'noun'
    case 'pron': return 'pron'
    case 'adj': case 'adjp': return 'adj'
    case 'verb': return 'verb'
    case 'numr': return 'numr'
    default: return 'uninflected'
  }
}
