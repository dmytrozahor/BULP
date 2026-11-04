/** SPEC 63 CR-1: lazy loader of the correspondence-group sidecar lm/cg/<bucket>.json (key plain(lemma)); reactive like lm/xr, fetched only by CorrBlock (never in the first load, never in cardData()). */
import { lmBucket } from '../../core/parts.ts'
import { plain, unpackCg, type CgShard, type CorrGroup } from '../../core/corr.ts'
import { store } from './parts.ts'

/** the LM_NAMES entry of this sidecar */
export const CG_NAME = 'cg' as const
const shards = store<Record<string, CorrGroup[]>>(b => `./data/lm/cg/${b}.json`, j => unpackCg(j as CgShard))
/** the groups a lemma is in; undefined while the shard loads, [] when it is in none (or the shard does not exist) */
export const corrOf = (word: string): CorrGroup[] | undefined => {
  if (!word) return []
  const k = plain(word), b = String(lmBucket(k)), s = shards.peek(b)
  return s === undefined ? (shards.has(b) ? [] : undefined) : (s[k] ?? [])
}
