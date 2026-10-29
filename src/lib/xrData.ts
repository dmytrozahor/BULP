/** SPEC 63 GG-18: lazy loader of the dictionary cross-reference sidecar lm/xr/<bucket>.json (key lk(headword)); reactive like lm/se, fetched only by the component that shows it (never in the first load). */
import { lk } from '../../core/cv.ts'
import { xrBucket } from '../../core/parts.ts'
import type { Ptr } from '../../core/xref.ts'
import { store } from './parts.ts'

export type XrRow = Omit<Ptr, 'h'>
const shards = store<Record<string, XrRow[]>>(b => `./data/lm/xr/${b}.json`, j => j as Record<string, XrRow[]>)
/** the pointers of a headword; undefined while the shard loads, [] when the dictionaries point nowhere from it */
export const xrOf = (word: string): XrRow[] | undefined => {
  if (!word) return []
  const k = lk(word), s = shards.peek(String(xrBucket(k)))
  return s === undefined ? (shards.has(String(xrBucket(k))) ? [] : undefined) : (s[k] ?? [])
}
export const xrLoaded = (word: string): boolean => !word || shards.has(String(xrBucket(lk(word))))
