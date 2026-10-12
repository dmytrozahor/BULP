/**
 * Existence oracles over the browser data for core/derivation.ts (DV-2) and core/modernize.ts (MO-2).
 * VESUM here = what the browser has: the paradigms of the corpus lemmas (ВЕСУМ forms) and lexindex.json (non-normative VESUM forms);
 * the normative VESUM list as a whole is not shipped (src/lib/analyze.ts), so a form that is only in VESUM and not in a corpus lemma's paradigm is invisible.
 */
import { key } from '../../core/text.ts'
import type { Has } from '../../core/derivation.ts'
import type { AnnotateData } from './annotate.ts'

export const lexHas = (d: Pick<AnnotateData, 'search' | 'paradigmMap' | 'lexindex'>): Has => form => {
  const k = key(form)
  if (d.paradigmMap.has(k) || d.lexindex?.vesum[k]) return 'vesum'
  return d.search.map.has(k) ? 'corpus' : null
}
export const lexHasBool = (d: Pick<AnnotateData, 'search' | 'paradigmMap' | 'lexindex'>) => { const h = lexHas(d); return (form: string) => !!h(form) }
