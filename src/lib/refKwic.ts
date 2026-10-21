/** SPEC 63 CP-3: KWIC lines for a card whose data keeps only witness references (archaic entries, TOROT name / ORV evidence): the line is cut from the witness text shard, nothing is invented. */
import type { Kwic } from '../../core/types.ts'
import { findLoc, loadTokens, type Tok } from './witnessText.ts'
import { kwicAt } from './unlinked.ts'

export interface RefLike { w: string; loc: string }
/** at most `max` lines, one per distinct (witness, locator); a reference whose shard or locator is missing is skipped */
export async function kwicFromRefs(refs: RefLike[], dateOf: (w: string) => [number, number] | undefined, max = 8, load: (id: string) => Promise<Tok[] | null> = loadTokens): Promise<Kwic[]> {
  const seen = new Set<string>(), out: Kwic[] = []
  for (const r of refs) {
    if (out.length >= max) break
    const k = r.w + '|' + r.loc; if (seen.has(k)) continue; seen.add(k)
    const toks = await load(r.w).catch(() => null); if (!toks) continue
    const i = findLoc(toks, r.loc), line = i >= 0 ? kwicAt(toks, i, r.w) : undefined
    if (line) out.push({ ...line, date: dateOf(r.w) ?? [0, 0] })
  }
  return out
}
/** witnesses of a reference list with the number of references in each (the items of WitnessPanel) */
export const witnessCounts = (refs: { w: string }[]): { w: string; n: number }[] => {
  const m = new Map<string, number>(); for (const r of refs) m.set(r.w, (m.get(r.w) ?? 0) + 1)
  return [...m].map(([w, n]) => ({ w, n })).sort((a, b) => b.n - a.n || a.w.localeCompare(b.w))
}
/** the witnesses of a lemma card with the number of tokens (BL-6c `byW`, else KWIC lines, a lower bound) summed over its spellings */
export const formsWitnesses = (forms: { byW?: Record<string, number>; kwic: { w: string }[] }[]): { w: string; n: number }[] => {
  const m = new Map<string, number>()
  for (const f of forms) if (f.byW) for (const [w, n] of Object.entries(f.byW)) m.set(w, (m.get(w) ?? 0) + n); else for (const k of f.kwic) m.set(k.w, (m.get(k.w) ?? 0) + 1)
  return [...m].map(([w, n]) => ({ w, n })).sort((a, b) => b.n - a.n || a.w.localeCompare(b.w))
}
