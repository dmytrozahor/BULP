/** SPEC 63 SE-8: lazy loader of the sense-evolution sidecar lm/se/<bucket>.json (4096 buckets, key lk(word)); reactive like the other parts, fetched only when the block opens. */
import { lk } from '../../core/cv.ts'
import { seBucket } from '../../core/parts.ts'
import type { SeEntry } from '../../core/se.ts'
import { store } from './parts.ts'

const shards = store<Record<string, SeEntry>>(b => `./data/lm/se/${b}.json`, j => j as Record<string, SeEntry>)
/** the entry of a card word; undefined while its shard loads or when the word has none */
export const seOf = (word: string): SeEntry | undefined => { const k = lk(word); return shards.peek(String(seBucket(k)))?.[k] }
/** true once the shard of the word's bucket has arrived (so «немає даних» is shown only after the load, not during it) */
export const seLoaded = (word: string): boolean => shards.has(String(seBucket(lk(word))))
