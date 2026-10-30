/**
 * SPEC 63 CP-10.4 / MM-41: the form route /f/<кÿнь> resolves through the SAME fold candidates as search and the annotator (core/zak-folds.ts via core/word-rules.ts featurePairs).
 * Candidates are collapsed to the lemmas / cards that confirm them (VESUM, our cards): кÿнь → кінь and конь (a form of кінь) are ONE lemma. Exactly one confirmed lemma = redirect.
 * Several lemmas (live data: вÿс → віз, but also вез, воз): ЕУМ um162 glosses ÿ as the reflex of о in the і-reading («вÿс «віз»», кÿнь «кінь»), so the і-reading decides (voiced spelling first: вÿс → віз beats віс) when it confirms exactly one
 * lemma; otherwise no redirect (the page stays the unlinked-spelling page with its candidate list).
 */
import { key } from '../../core/text.ts'
import { featurePairs } from '../../core/word-rules.ts'
import { ZAK_FOLDS, isZakMarked } from '../../core/zak-folds.ts'

export type ZakTarget = { state: 'none' } | { state: 'loading' } | { state: 'one'; to: string }
/** the і-reading, voiced spelling first (ЕУМ prints the devoiced final consonant [вус «віз»]; the spelling restores it), then the unvoiced one */
const I_TIERS = [['ORTH-ZAK-Y-V'], ['ORTH-ZAK-Y']]
const I_TIER = new Set(I_TIERS.flat())
/**
 * `lemmasOf(k)` = the lemmas / card ids confirming the key (search index, VESUM, light / archaic cards), [] = unknown; `loaded` = the shard of that key is in memory (ixLoaded):
 * a candidate whose shard is still loading must not read as «unknown»
 */
export function zakTarget(form: string, lemmasOf: (k: string) => string[], loaded: (k: string) => boolean): ZakTarget {
  const k = key(form)
  if (!k || !isZakMarked(k) || lemmasOf(k).length) return { state: 'none' }
  const cands = [...new Set(ZAK_FOLDS.map(f => key(f.apply(k))).filter(c => c && c !== k))]
  if (cands.some(c => !loaded(c))) return { state: 'loading' }
  const pairs = featurePairs(k, c => lemmasOf(c).length > 0).filter(p => p.rule.startsWith('ORTH-ZAK') && p.known)
  const lemmas = (ps: typeof pairs) => new Set(ps.flatMap(p => lemmasOf(p.to)))
  const pick = (ps: typeof pairs): ZakTarget => { const l = lemmas(ps), first = [...ps].sort((a, b) => Number(I_TIER.has(b.rule)) - Number(I_TIER.has(a.rule)))[0]; return l.size === 1 && first ? { state: 'one', to: first.to } : { state: 'none' } }
  const all = pick(pairs)
  if (all.state === 'one') return all
  for (const t of I_TIERS) { const ps = pairs.filter(p => t.includes(p.rule)); if (ps.length) return pick(ps) }   // the first confirmed і-reading decides, only if it confirms one lemma
  return { state: 'none' }
}
/** the note, only when the fold really leads from `from` to `target` (a hand-edited ?zak= shows nothing) */
export function zakNote(from: string | undefined, target: string): { text: string; cite: string } | undefined {
  const k = key(from ?? ''); if (!k || !isZakMarked(k)) return undefined
  const p = featurePairs(k, c => c === key(target)).find(x => x.rule.startsWith('ORTH-ZAK') && x.to === key(target)); if (!p) return undefined
  return { text: `написання ${k} зведено до ${key(target)} (закарпатське ${/[ôê]/.test(k) ? 'ô' : 'ÿ'}, ЕУМ um162)`, cite: p.cite.locator }
}
