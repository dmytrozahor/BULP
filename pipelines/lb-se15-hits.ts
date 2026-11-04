/**
 * SPEC 63 SE-15 — the dictionary hits of the SE-15 / SE-14 dialect tables for pipelines/lb-measure.ts (LB_EXTRA_HITS), read from data/work/se-parsed/<dict>.json without a build: key (lk of the headword) → DictHit[]
 * exactly as `sumLabelHit` makes them in the build (word-level hit = strict, place-only = `p: true`). A row off the alphabetical spine (`unv`) still labels an existing lemma, so it is kept here.
 * Also writes `LB_SE15_NEW` (JSON): the headwords that may make a dictionary-only card (no `unv`, word-level) so that the measurement can count the ones the live build does not have.
 * Env: SE15_PARSED (dir, default data/work/se-parsed), LB_EXTRA_OUT (default lb-se15-hits.json), LB_SE15_NEW (default lb-se15-new.json). Crash-tolerant: reads only, atomic writes.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { lk } from '../core/cv.ts'
import type { DictHit } from '../core/dict-labels.ts'
import { sumLabelHit } from '../core/labels.ts'
import type { SeRow } from '../core/se.ts'
import { writeJsonAtomic } from './robust.ts'

export const SE15_DICTS = ['chabanenko', 'onyshkevych', 'sabadosh', 'bukovyna', 'hutsul', 'lysenko', 'verkhratsky', 'poltavshchyna']
export function se15Hits(dir = resolve(process.env.SE15_PARSED ?? 'data/work/se-parsed'), dicts: string[] = SE15_DICTS): { hits: Record<string, DictHit[]>; cards: Record<string, string[]> } {
  const hits: Record<string, DictHit[]> = {}, cards: Record<string, Set<string>> = {}
  for (const d of dicts) {
    const f = resolve(dir, d + '.json'); if (!existsSync(f)) continue
    let j: { rows: [string, SeRow][] }; try { j = JSON.parse(readFileSync(f, 'utf8')) } catch { continue }
    for (const [h, r] of j.rows) {
      const lb = r.lb?.[0]; if (!lb) continue
      const hit = sumLabelHit(d, lb, r.g, undefined, r.v?.[0]); if (!hit) continue
      const k = lk(h), list = hits[k] ?? (hits[k] = [])
      if (!list.some(x => x.t === hit.t && x.a === hit.a)) list.push(hit)
      if (!r.unv && !hit.p) (cards[d] ??= new Set()).add(k)
    }
  }
  return { hits, cards: Object.fromEntries(Object.entries(cards).map(([d, s]) => [d, [...s]])) }
}
if (process.argv[1]?.endsWith('lb-se15-hits.ts')) {
  const { hits, cards } = se15Hits()
  writeJsonAtomic(process.env.LB_EXTRA_OUT ?? 'lb-se15-hits.json', JSON.stringify(hits)); writeJsonAtomic(process.env.LB_SE15_NEW ?? 'lb-se15-new.json', JSON.stringify(cards))
  console.log(JSON.stringify({ lemmas: Object.keys(hits).length, cardHeads: Object.fromEntries(Object.entries(cards).map(([d, a]) => [d, a.length])) }))
}
