/**
 * SPEC 63 PV-8: Old East Slavic inflection spellings folded to the spelling that core/phonology.ts derive() already understands. Separate module (the MU agent edits mu-fold.ts).
 * A fold only proposes a candidate spelling; it becomes a link only when VESUM lists the derived modern form (build-link.ts, M-3.2). Pure.
 *
 * Sources (research/11-historical-morphology.md, Павленко 2010 = PAVL, quoted there):
 *  > «плодъмь (-омь) · селъмь (-омь) · коньмь (-емь) · польмь (-емь) · мечьмь (-ьмь)» — PAVL p. 75, ŏ/jŏ-stems, instr. sg (a final -мь beside -мъ/-омъ/-емъ)
 *  > «Д … плодомъ · селомъ · конемъ · полемъ · мечемъ» — PAVL p. 75 (the same case with -омъ/-емъ)
 *  > «Іменні прикметники змінювалися як іменнники з основою на *-ŏ/-јŏ та з основою на *-ā/-јā.» — PAVL p. 98–99
 *  > aorist «ведохъ, веде, веде, ведохомъ, ведосте, ведоша», imperfect «писахъ, писаше» — PAVL p. 111–114 (verbs are lemmatised by Stanza ORV; no verb fold is stated here)
 * NOT implemented, no quoted description held: long adjectives -ыи/-ыимъ/-аго, gen. -еа/-ыя, ѣ in dat./instr. -ѣмъ beyond the table above (research/11 §2 lists none verbatim).
 */
import { Q, type Evidence } from './evidence.ts'
import { foldById } from './orthography.ts'

export interface OesFold { id: string; cite: Evidence; apply: (w: string) => string }
const PAVL75 = 'research/11 §2, ŏ/jŏ-stems (Павленко 2010, с. 75)'
const MJER = Q('PAVL', PAVL75, 'плодъмь (-омь) · селъмь (-омь) · коньмь (-емь) · польмь (-емь) · мечьмь (-ьмь)')
const EM = Q('PAVL', PAVL75, 'Д … плодомъ · селомъ · конемъ · полемъ · мечемъ')

export const OES_FOLDS: OesFold[] = [
  { id: 'OES-MJER', cite: MJER, apply: w => w.replace(/мь$/, 'мъ') },                          // коньмь → коньмъ (final jer after м)
  { id: 'OES-EM', cite: EM, apply: w => w.replace(/([^аеиоуыѣюя])ѣмъ$/, '$1емъ').replace(/ѣмь$/, 'емь') },   // instr./dat. -ѣмъ ≈ -емъ (soft stems: конемъ)
]
export const oesFoldById = Object.fromEntries(OES_FOLDS.map(f => [f.id, f]))

/** Variant spellings of an Old-Cyrillic token (each a single fold, or MJER then EM); the original spelling is not repeated. */
export function oesVariants(w: string): { form: string; trace: string[] }[] {
  const out = new Map<string, string[]>()
  for (const f of OES_FOLDS) { const n = f.apply(w); if (n !== w && !out.has(n)) out.set(n, [f.id]) }
  for (const [n, t] of [...out]) for (const f of OES_FOLDS) { const m = f.apply(n); if (m !== n && m !== w && !out.has(m)) out.set(m, [...t, f.id]) }
  return [...out].map(([form, trace]) => ({ form, trace }))
}

// registered so that traceSteps() (build-link.ts) can show and cite the step
for (const f of OES_FOLDS) foldById[f.id] ??= { id: f.id, era: ['orv'], branch: false, cite: f.cite, apply: f.apply }
