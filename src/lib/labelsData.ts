/** SPEC 63 LB-5: lazy loader of the labels sidecar lm/lb/<bucket>.json (4096 buckets, key lk(word), like lm/se); an absent entry = the build found nothing to say about the word beyond the defaults. */
import { computed } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { lk } from '../../core/cv.ts'
import { seBucket } from '../../core/parts.ts'
import { dialectOf, emptyEntry, type LbEntry, type RegionCount } from '../../core/labels.ts'
import { store } from './parts.ts'

const shards = store<Record<string, LbEntry>>(b => `./data/lm/lb/${b}.json`, j => j as Record<string, LbEntry>)
/** the stored entry of a word; undefined while the shard loads or when the word has none */
export const lbPeek = (word: string): LbEntry | undefined => { if (!word) return undefined; const k = lk(word); return shards.peek(String(seBucket(k)))?.[k] }
/** true once the shard of the word's bucket has arrived (so «немає даних» is shown only after the load, not during it) */
export const lbLoaded = (word: string): boolean => !word || shards.has(String(seBucket(lk(word))))

/**
 * The entry a card renders. While loading: `loading`. After: the stored entry, or the default («недостатньо даних» + what is needed);
 * when the host knows the lemma's witness-region table (full card) and the shard has no entry, the class is computed from that table with the same code as the build.
 */
export function useLabels(word: MaybeRefOrGetter<string>, byRegion?: MaybeRefOrGetter<RegionCount[] | undefined>) {
  const loading = computed(() => !lbLoaded(toValue(word)))
  const entry = computed<LbEntry>(() => {
    const w = toValue(word), e = lbPeek(w), by = byRegion ? toValue(byRegion) : undefined
    if (e) return e
    const base = emptyEntry()
    return by?.length ? { ...base, d: dialectOf([], [], by), corpus: true } : base
  })
  return { entry, loading }
}
