/**
 * Existence oracles over the browser data for core/derivation.ts (DV-2) and core/modernize.ts (MO-2).
 * VESUM here = what the browser has: the paradigms of the corpus lemmas (ВЕСУМ forms) and lexindex.json (non-normative VESUM forms);
 * the normative VESUM list as a whole is not shipped (src/lib/analyze.ts), so a form that is only in VESUM and not in a corpus lemma's paradigm is invisible.
 */
import { key } from '../../core/text.ts'
import { derivPos, type DerivPos, type Has } from '../../core/derivation.ts'
import type { AnnotateData } from './annotate.ts'

export const lexHas = (d: Pick<AnnotateData, 'search' | 'paradigmMap' | 'lexindex'> & Partial<Pick<AnnotateData, 'cards'>>): Has => (form, pos?: DerivPos) => {
  const k = key(form)
  if (!pos) {
    if (d.paradigmMap.has(k) || d.lexindex?.vesum[k]) return 'vesum'
    return d.search.map.has(k) ? 'corpus' : null
  }
  // BL-5b: the candidate must be its own LEMMA of the same POS (одне = form of один, not a lemma)
  const own = (h: { lemma: string; tags: string }) => key(h.lemma) === k && h.tags.startsWith(pos)
  if (d.paradigmMap.get(k)?.some(own) || d.lexindex?.vesum[k]?.some(own)) return 'vesum'
  for (const h of d.search.map.get(k) ?? []) {
    if (h.via !== 'lemma' || key(h.lemma) !== k) continue
    const c = d.cards?.get(h.lemma)
    if (c && derivPos(c.pos, c.paradigmKind, c.lemma) === pos) return 'corpus'
  }
  return null
}
export const lexHasBool = (d: Pick<AnnotateData, 'search' | 'paradigmMap' | 'lexindex'>) => { const h = lexHas(d); return (form: string) => !!h(form) }
