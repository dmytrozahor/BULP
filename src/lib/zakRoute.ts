/**
 * SPEC 63 CP-10.4 / MM-41: the form route /f/<кÿнь> resolves through the SAME fold candidates as search and the annotator (core/zak-folds.ts via core/word-rules.ts featurePairs).
 * Only when exactly ONE standard spelling is confirmed (VESUM / our cards know it) the route redirects to its card with the note; several or none = the plain «незв’язане написання» page.
 */
import { key } from '../../core/text.ts'
import { featurePairs } from '../../core/word-rules.ts'
import { ZAK_FOLDS, isZakMarked } from '../../core/zak-folds.ts'

export type ZakTarget = { state: 'none' } | { state: 'loading' } | { state: 'one'; to: string }
/** `known` = the lexicon lookup (knownKeyOf), `loaded` = the shard of that key is in memory (ixLoaded): a candidate whose shard is still loading must not read as «unknown» */
export function zakTarget(form: string, known: (k: string) => boolean, loaded: (k: string) => boolean): ZakTarget {
  const k = key(form)
  if (!k || !isZakMarked(k) || known(k)) return { state: 'none' }
  const cands = [...new Set(ZAK_FOLDS.map(f => key(f.apply(k))).filter(c => c && c !== k))]
  if (cands.some(c => !loaded(c))) return { state: 'loading' }
  const to = [...new Set(featurePairs(k, known).filter(p => p.rule.startsWith('ORTH-ZAK') && p.known).map(p => p.to))]
  return to.length === 1 ? { state: 'one', to: to[0]! } : { state: 'none' }
}
/** the note, only when the fold really leads from `from` to `target` (a hand-edited ?zak= shows nothing) */
export function zakNote(from: string | undefined, target: string): { text: string; cite: string } | undefined {
  const k = key(from ?? ''); if (!k || !isZakMarked(k)) return undefined
  const p = featurePairs(k, c => c === key(target)).find(x => x.rule.startsWith('ORTH-ZAK') && x.to === key(target)); if (!p) return undefined
  return { text: `написання ${k} зведено до ${key(target)} (закарпатське ${/[ôê]/.test(k) ? 'ô' : 'ÿ'}, ЕУМ um162)`, cite: p.cite.locator }
}
