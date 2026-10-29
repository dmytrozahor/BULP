/** SPEC 63 CP-9: lazy loader of the VESUM-paradigm sidecar lm/par/<bucket>.json (1024 buckets, key lk(word)); reactive like the other parts, fetched only for a card without a paradigm of its own. */
import { lk } from '../../core/cv.ts'
import { parBucket, parOfShard, type ParLemma, type ParShard } from '../../core/thin-par.ts'
import { store } from './parts.ts'

const shards = store<ParShard>(b => `./data/lm/par/${b}.json`, j => j as ParShard)
/** the VESUM lemmas (homonyms) of a word with their paradigms; undefined while the shard loads or when VESUM has no such lemma */
export const parOf = (word: string): ParLemma[] | undefined => { const k = lk(word); return k ? parOfShard(shards.peek(String(parBucket(k))), k) : undefined }
/** true once the shard of the word's bucket has arrived (so «немає даних» is shown only after the load) */
export const parLoaded = (word: string): boolean => { const k = lk(word); return !k || shards.has(String(parBucket(k))) }
