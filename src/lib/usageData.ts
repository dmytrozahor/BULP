/** UL-1: reactive lemma → usage-claims lookup over the lm/usage/<bucket>.json shards (SPEC 63 PF-1; empty until the shard arrives or when it is absent). */
import { shallowRef } from 'vue'
import { usageClaims, type UsageFile } from '../../core/usage.ts'
import { lmLoad, lmPeek } from './parts.ts'

/** the file-level record (vesumLoc, wikt licence) of any loaded shard, for the legend */
export const usageFile = shallowRef<UsageFile>()
export function loadUsage(): void {
  if (!usageFile.value) lmLoad<UsageFile>('usage', 'а').then(f => { if (f && f.format === 1) usageFile.value = f })
}
/** Usage claims of a lemma (reactive through the shard store). */
export function usageOf(lemma: string) {
  const f = lmPeek<UsageFile>('usage', lemma), rows = f?.lemmas[lemma]
  return rows && f ? usageClaims(lemma, rows, f.vesumLoc, f.wikt.retrieved) : []
}
