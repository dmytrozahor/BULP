/**
 * BUILD step SPEC 63 GG-18: the cross-reference pointers of the held dictionaries → data/work/xr.json = { lk(headword): XrRow[] } (not committed), sharded by build-parts into lm/xr/<bucket>.json.
 * Sources (all written by parsers, policy fields only): data/work/se-parsed/<id>.json `.ptrs` (OCR dictionaries, pipelines/parse-se-dicts.ts) and data/work/xref/<dict>.json (СУМ-11/СУМ-20,
 * pipelines/sum-scan.ts). A pointer is headword + target + relation + dictionary + volume/page: no dictionary text (GG-7). Pure loading in `loadPointers`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dedupePtrs, type Ptr } from '../core/xref.ts'
import { writeJsonAtomic } from './robust.ts'

export const lkx = (s: string): string => s.normalize('NFC').replace(/[́]/g, '').toLowerCase()
/** a stored pointer: target `t`, kind `k`, relation `r`, aspect `a`, dictionary `d`, locator `l` */
export type XrRow = Omit<Ptr, 'h'>
const RANK = (d: string): number => (d === 'sum11' ? 0 : d === 'sum20' ? 1 : 2)
const PER_HEAD = 8

export function loadPointers(root: string): { byHead: Map<string, XrRow[]>; perDict: Record<string, number> } {
  const all: Ptr[] = []
  for (const dir of ['data/work/se-parsed', 'data/work/xref']) {
    const d = resolve(root, dir); if (!existsSync(d)) continue
    for (const f of readdirSync(d).filter(x => x.endsWith('.json')).sort()) {
      try { const j = JSON.parse(readFileSync(resolve(d, f), 'utf8')) as { ptrs?: Ptr[] }; if (Array.isArray(j.ptrs)) all.push(...j.ptrs) } catch { /* torn file: ignored (RS-1) */ }
    }
  }
  return group(dedupePtrs(all))
}
export function group(ps: Ptr[]): { byHead: Map<string, XrRow[]>; perDict: Record<string, number> } {
  const byHead = new Map<string, XrRow[]>(), perDict: Record<string, number> = {}
  for (const { h, ...r } of ps) {
    const k = lkx(h); if (!k || !r.t || lkx(r.t) === k) continue
    const list = byHead.get(k) ?? byHead.set(k, []).get(k)!
    if (!list.some(x => x.t === r.t && x.k === r.k && x.r === r.r && x.d === r.d)) { list.push(r); perDict[r.d] = (perDict[r.d] ?? 0) + 1 }
  }
  for (const [k, l] of byHead) byHead.set(k, l.sort((a, b) => RANK(a.d) - RANK(b.d)).slice(0, PER_HEAD))
  return { byHead, perDict }
}

/** writes data/work/xr.json; returns the counts for the build log */
export function writeXref(root: string): { heads: number; pointers: number; perDict: Record<string, number> } {
  const { byHead, perDict } = loadPointers(root)
  writeJsonAtomic(resolve(root, 'data/work/xr.json'), JSON.stringify(Object.fromEntries([...byHead.entries()].sort(([a], [b]) => (a < b ? -1 : 1)))))
  return { heads: byHead.size, pointers: [...byHead.values()].reduce((n, l) => n + l.length, 0), perDict }
}
