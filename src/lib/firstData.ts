/** SPEC 63 DB-2: lazy loader of lm/fr/<bucket>.json (4096 buckets by lk(word), like lm/lb): the earliest reliable attestation of a lemma per region. Read by the badge and the search rows AFTER they render; never in a core card or on the keystroke path. */
import { lk } from '../../core/cv.ts'
import { seBucket } from '../../core/parts.ts'
import type { FrEntry } from '../../core/first-region.ts'
import { store } from './parts.ts'

const shards = store<Record<string, FrEntry>>(b => `./data/lm/fr/${b}.json`, j => j as Record<string, FrEntry>)
const bucket = (word: string) => String(seBucket(lk(word)))
/** the stored entry of a word; undefined while the shard loads or when the word has none (a missing shard is «none», `frLoaded` tells which) */
export const frPeek = (word: string): FrEntry | undefined => { if (!word) return undefined; return shards.peek(bucket(word))?.[lk(word)] }
/** true once the shard of the word's bucket has arrived or is known to be absent */
export const frLoaded = (word: string): boolean => !word || shards.has(bucket(word))
