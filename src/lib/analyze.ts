/**
 * Browser-side analysis of an arbitrary word (SPEC 00 P-1.4: a label carries the rule citation AND the triggering data).
 * One detector engine for every rule table (P-4.2). The normative VESUM list is NOT shipped to the browser (lexindex.json holds only
 * non-normative VESUM forms + LanguageTool), so for a word known to neither lexindex nor the lexicon the absence-based rules would fire
 * on "not in VESUM" = unknown. They are therefore gated (evidence-safe, P-3.1): only rules whose test needs no VESUM absence run.
 */
import type { LexIndex, VesumHit } from '../../core/types.ts'
import { detect, type Ctx, type Rule } from '../../core/detect.ts'
import { CS_RULES, CONTACT_RULES, DIALECT_RULES, REGISTER_RULES, SURZHYK_BASIS, DIALECTS } from '../../core/rules.ts'
import { derive } from '../../core/phonology.ts'
import { key, normalizeOld } from '../../core/text.ts'
import type { Claim } from '../../core/evidence.ts'

export const ALL_RULES: Rule[] = [...CS_RULES, ...CONTACT_RULES, ...DIALECT_RULES, ...REGISTER_RULES]
export const ruleOf = (id: string) => ALL_RULES.find(r => r.id === id)
/** Rules whose test is true merely because VESUM has no entry (notInVesum / !normative on an empty list) — gated when the word is unknown. */
export const GATED_IDS = new Set(['ORT-JO', 'MOR-PART-SHCH', 'PFX-VS', 'SFX-YVA', 'PFX-RAZ', 'SFX-STVO', 'REG-H-TSIA'])
const isGated = (r: Rule) => r.axis === 'dialect' || GATED_IDS.has(r.id)

export interface LexData { lexindex?: LexIndex; paradigmMap: Map<string, VesumHit[]> }
export const emptyLex = (): LexData => ({ paradigmMap: new Map() })

export const hitsOf = (d: LexData, form: string): VesumHit[] => {
  const k = key(form)
  return [...(d.paradigmMap.get(k) ?? []), ...(d.lexindex?.vesum[k] ?? [])]
}

export interface Analysis {
  word: string; known: boolean; vesum: VesumHit[]; lt?: [string, string]
  claims: Record<string, Claim<true>>; hints: { rule: string; label: string }[]; gated: string[]
}

/** Run all detector tables over one word. `year` undefined = contemporary text (core/detect.ts Ctx.year). */
export function runDetectors(word: string, d: LexData, year?: number): Analysis {
  const form = key(word)
  const vesum = hitsOf(d, form), lt = d.lexindex?.lt[form]
  const known = vesum.length > 0 || !!lt
  const ctx: Ctx = {
    form, norm: normalizeOld(word).norm, year, vesum,
    lt: lt ? { file: lt[0], suggest: lt[1] } : undefined,
    inLexicon: f => hitsOf(d, f), derive: w => derive(w).candidates.map(c => c.form),
  }
  const rules = known ? ALL_RULES : ALL_RULES.filter(r => !isGated(r))
  const { claims, hints } = detect(rules, ctx)
  return { word, known, vesum, lt, claims, hints, gated: known ? [] : ALL_RULES.filter(isGated).map(r => r.id) }
}

// ── label classification (marker colours of the annotator, filters) ────────────────────────────
export type Category = 'cs' | 'contact' | 'dialect' | 'colloquial' | 'archaic'
export const CATEGORIES: Category[] = ['cs', 'contact', 'dialect', 'colloquial', 'archaic']
export const CATEGORY_UK: Record<Category, string> = {
  cs: 'церковнослов’янське', contact: 'контактне / суржик', dialect: 'діалектне', colloquial: 'розмовне', archaic: 'архаїчний правопис',
}
const CONTACT_LABELS = new Set([...SURZHYK_BASIS, 'surzhyk', 'nonnormative', 'not_recommended', 'nonstandard'])
export function categoryOf(label: string): Category | undefined {
  if (label === 'church_slavonic') return 'cs'
  if (label === 'colloquial') return 'colloquial'
  if (label === 'archaic_orthography') return 'archaic'
  if (CONTACT_LABELS.has(label)) return 'contact'
  if (label in DIALECTS) return 'dialect'
  return undefined
}
/**
 * Strongest category of a claim set: highest score; ties resolved by CATEGORIES order. Archaic orthography is a neutral note
 * ("норма свого часу", core/rules ORT-OLD) and only wins when nothing else fired.
 */
export function strongest(claims: Record<string, Claim<true>>): Category | undefined {
  let best: { c: Category; s: number } | undefined
  for (const [label, cl] of Object.entries(claims)) {
    const c = categoryOf(label); if (!c || cl.value === 'unknown') continue
    const s = c === 'archaic' ? -1 + (cl.score ?? 1) / 10 : cl.score ?? 1
    if (!best || s > best.s || (s === best.s && CATEGORIES.indexOf(c) < CATEGORIES.indexOf(best.c))) best = { c, s }
  }
  return best?.c
}
