/** SPEC 63 CV-4 runtime: «неперевірена лема» cards (public/data/uv/, core/uv.ts) — prefix search over unlinked spellings and the group-card lookup. */
import { key } from '../../core/text.ts'
import { UV_MIN_QUERY, uvPrefixFile, uvShard, type UvGroup, type UvPrefixShard } from '../../core/uv.ts'

export type UvFetch = (path: string) => Promise<unknown | null>
const cache = new Map<string, Promise<unknown | null>>()
export const fetchUv: UvFetch = path => {
  let p = cache.get(path)
  if (!p) cache.set(path, p = fetch(`./data/uv/${path}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null))
  return p
}
export interface UvHit { group: string; head: string; matched: string; exact: boolean }

/** Unlinked spellings whose key equals / starts with the query (≥ 2 letters), one hit per group, exact first, then the shorter spelling. Ranked by the caller AFTER verified cards. */
export async function uvSearch(q: string, limit = 30, get: UvFetch = fetchUv): Promise<UvHit[]> {
  const qk = key(q.trim()); if ([...qk].length < UV_MIN_QUERY) return []
  const sh = (await get(`p/${uvPrefixFile(qk)}`)) as UvPrefixShard | null; if (!sh) return []
  const hits = new Map<string, UvHit & { len: number }>()
  for (const [sk, [group, head]] of Object.entries(sh)) {
    if (!sk.startsWith(qk)) continue
    const h = { group, head, matched: sk, exact: sk === qk, len: sk.length }, cur = hits.get(group)
    if (!cur || Number(h.exact) > Number(cur.exact) || (h.exact === cur.exact && h.len < cur.len)) hits.set(group, h)
  }
  return [...hits.values()].sort((a, b) => Number(b.exact) - Number(a.exact) || a.len - b.len || a.head.localeCompare(b.head, 'uk')).slice(0, limit)
}
export async function loadUvGroup(id: string, get: UvFetch = fetchUv): Promise<UvGroup | undefined> {
  const sh = (await get(`g/${uvShard(id)}`)) as Record<string, UvGroup> | null
  return sh?.[id]
}
/** the group (card) a spelling belongs to */
export async function uvOfSpelling(form: string, get: UvFetch = fetchUv): Promise<{ group: string; head: string } | undefined> {
  const k = key(form); if (!k) return undefined
  const sh = (await get(`p/${uvPrefixFile(k)}`)) as UvPrefixShard | null, e = sh?.[k]
  return e ? { group: e[0], head: e[1] } : undefined
}
