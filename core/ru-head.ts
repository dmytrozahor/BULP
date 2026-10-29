/**
 * SPEC 63 MM-36: the Russian-headword index that wires the MM-25 classifier (core/ru-contact.ts) into the app. Built from the ru→uk rows of public/data/r2u.json
 * (Уманець–Спілка, Кримський–Єфремов, Ізюмов, Дорошенко–Станиславський, Якубські) by pipelines/build-r2u.ts `buildRuHead`, split into lm/ru/<bucket>.json by build-parts,
 * read by src/lib/ruIndex.ts. Entries are filed under ruKey(headword); a hit keeps the dictionary, the locator, the Ukrainian equivalents and a quote of ≤ 200 characters (cite-only, research/30).
 * Pure.
 */
import type { RuHit } from './ru-contact.ts'
import { ruKey } from './ru-contact.ts'
import { key } from './text.ts'

/** [dictionary short name, locator, equivalents (key()ed), quote] */
export type RuHeadRow = [string, string, string[], string]
export interface RuHeadFile { format: 1; generated: string; entries: Record<string, RuHeadRow[]> }
export const RU_HEAD_MAX = 4

/** ru→uk rows [dict id, row id, lookup, scope, heads, equivalents, quote] (R2uFile.rows) → the index; `dicts` maps a dict id to [short name, direction] */
export function buildRuHeadEntries(rows: readonly (readonly [number, number, string, string, string[], string[], string])[], dicts: ReadonlyMap<number, { short: string; dir: string }>): Record<string, RuHeadRow[]> {
  const entries: Record<string, RuHeadRow[]> = {}
  for (const r of rows) {
    const d = dicts.get(r[0]); if (!d || d.dir !== 'ru-uk') continue
    const eq = [...new Set(r[5].map(e => key(e)).filter(e => e && !/\s/.test(e)))]
    if (!eq.length) continue
    for (const h of r[4]) {
      const k = ruKey(h); if (!k || /\s/.test(k)) continue
      const list = entries[k] ??= []
      if (list.length >= RU_HEAD_MAX || list.some(x => x[0] === d.short && x[1].endsWith(`#${r[0]}_${r[1]}`))) continue
      list.push([d.short, `r2u ${d.short} · s?w=${r[2]}#${r[0]}_${r[1]}`, eq, r[6].slice(0, 200)])
    }
  }
  return entries
}
export const ruHitsOf = (entries: Record<string, RuHeadRow[]> | undefined, k: string): RuHit[] =>
  (entries?.[k] ?? []).map(([dict, locator, equivalents, quote]) => ({ dict, locator, equivalents, quote }))
