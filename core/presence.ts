/**
 * SPEC 63 CP-10.7 — a tiny per-directory presence index of the optional sidecar shards (cd/, lm/<name>/, tc/<kind>/, wit/, uv/p, uv/g, unlinked/).
 * Most sidecars exist only for some lemmas, so the client used to fetch every bucket and take a 404 (a console resource error each time). The build lists which
 * files exist (pipelines/build-presence.ts, last step of the data build) in lm/presence.json; the client (src/lib/presence.ts, called from fetchJson) answers an
 * absent bucket with `null` without a request. A directory that is not in the index, or a missing index (an older build), means «unknown»: fetch as before.
 * Per directory the smallest of: the list of present numbers, the list of absent numbers, a hex bitmap; named (non-numeric) files: the list of names.
 */
/** p = present numbers; a = absent numbers below n (n and above are absent); h = hex bitmap (a number past its end is absent); names = the present file names */
export interface PresenceDir { p?: number[]; a?: number[]; n?: number; h?: string; names?: string[] }
export interface PresenceIndex { format: 1; dirs: Record<string, PresenceDir> }
/** the file of the index, under the data root (lm/ is a CDN dir, so the index travels with the build it describes) */
export const PRESENCE_FILE = 'lm/presence.json'
export const PRESENCE_URL = './data/lm/presence.json'
/** directories scanned (a trailing /* = every subdirectory); anything else is not indexed */
export const PRESENCE_DIRS = ['cd', 'wit', 'lm/*', 'tc/*', 'uv/p', 'uv/g', 'unlinked'] as const
/** more named files than this: the directory is not indexed (the list would cost more than the 404s it saves) */
export const MAX_NAMES = 4000

const jsonLen = (x: unknown) => JSON.stringify(x).length

/** the smallest encoding of the set of present bucket numbers; `n` = the largest number + 1 (every number from n up is absent) */
export function encodeBuckets(present: readonly number[], n: number): PresenceDir {
  const set = new Set(present), p = [...set].sort((x, y) => x - y)
  const a: number[] = []; for (let i = 0; i < n; i++) if (!set.has(i)) a.push(i)
  let h = ''; for (let i = 0; i < n; i += 4) h += ((set.has(i) ? 8 : 0) | (set.has(i + 1) ? 4 : 0) | (set.has(i + 2) ? 2 : 0) | (set.has(i + 3) ? 1 : 0)).toString(16)
  const cands: [PresenceDir, number][] = [[{ p }, jsonLen(p)], [{ a, n }, jsonLen(a) + String(n).length + 6], [{ h }, h.length + 2]]
  cands.sort((x, y) => x[1] - y[1])
  return cands[0]![0]
}
export const encodeNames = (names: readonly string[]): PresenceDir | undefined => names.length > MAX_NAMES ? undefined : { names: [...new Set(names)].sort() }

/** does the file exist: true / false from the index, undefined = unknown (directory not indexed, name not decodable) */
export function dirHas(d: PresenceDir | undefined, name: string): boolean | undefined {
  if (!d) return undefined
  if (d.names) return d.names.includes(name)
  if (!/^\d+$/.test(name)) return undefined
  const i = Number(name)
  if (d.p) return d.p.includes(i)
  if (d.a) return i < (d.n ?? 0) && !d.a.includes(i)
  if (d.h !== undefined) { const c = d.h[i >> 2]; return c === undefined ? false : (parseInt(c, 16) >> (3 - (i & 3)) & 1) === 1 }
  return undefined
}
/** `./data/<dir>/<file>.json` → present / absent / unknown (undefined) */
export function presenceOf(ix: PresenceIndex | null | undefined, url: string): boolean | undefined {
  if (!ix || ix.format !== 1) return undefined
  const m = /^\.\/data\/(.+)\/([^/]+)\.json$/.exec(url); if (!m) return undefined
  return dirHas(ix.dirs[m[1]!], m[2]!)
}

