/** SPEC 63 GG-14: lazy loader of the stress sidecar lm/st/<bucket>.json (core/stress-src.ts): stress printed by СУМ / r2u dictionaries / en.wiktionary, with source and locator. Fetched only by a card that renders «Вимова» / «Словозміна». */
import { lk } from '../../core/cv.ts'
import { stBucket, stOfShard, type StLemma, type StShard } from '../../core/stress-src.ts'
import { store } from './parts.ts'

const shards = store<StShard>(b => `./data/lm/st/${b}.json`, j => j as StShard)
/** the entries of a word (undefined while the shard loads or when no source prints stress for it) */
export const stOf = (word: string): StLemma[] | undefined => { const k = lk(word); return k ? stOfShard(shards.peek(String(stBucket(k))), k) : undefined }
export const stLoaded = (word: string): boolean => { const k = lk(word); return !k || shards.has(String(stBucket(k))) }
