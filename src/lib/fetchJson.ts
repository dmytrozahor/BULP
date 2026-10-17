/**
 * Client data loading with honest failure handling (audit C1/C2): a 404 is "absent" (null, cacheable); a network error / 5xx / 429 / 408 is transient —
 * retried with a bounded backoff, never cached, and reported in `loadFailures` so the shell can say so (DataNotice.vue) instead of showing "no data".
 */
import { ref, shallowReactive } from 'vue'
import { dataUrl } from './dataUrl.ts'

/** URLs whose load failed after the retries and has not succeeded since (reactive) */
export const loadFailures = shallowReactive(new Set<string>())
const retriers = new Set<() => void>()
/** a loader registers how to forget its failed entries and load them again */
export const onRetry = (fn: () => void): void => { retriers.add(fn) }
/** the «спробувати ще раз» action: every registered loader drops its failures and refetches on next read */
/** bumps on every retry: the shell re-keys the routed view with it, so readers that are not reactive (cached promises) run again */
export const retryEpoch = ref(0)
export function retryFailed(): void {
  loadFailures.clear(); retryEpoch.value++
  for (const f of retriers) f()
}

export const BACKOFF_MS = [400, 1500]
const transient = (status: number) => status >= 500 || status === 429 || status === 408
const sleep = (ms: number) => (ms > 0 ? new Promise<void>(r => setTimeout(r, ms)) : Promise.resolve())

/** GET + parse JSON. null = the file does not exist (404/410); throws after `delays.length + 1` attempts on a transient failure (and on a non-transient HTTP error / bad JSON, without retry) */
export async function fetchJson(url: string, delays: readonly number[] = BACKOFF_MS): Promise<unknown | null> {
  let last: unknown
  for (let i = 0; i <= delays.length; i++) {
    if (i > 0) await sleep(delays[i - 1]!)
    try {
      const r = await fetch(dataUrl(url))
      if (r.status === 404 || r.status === 410) { loadFailures.delete(url); return null }
      if (!r.ok) {
        last = new Error(`${url}: HTTP ${r.status}`)
        if (transient(r.status)) continue
        break
      }
      const j = await r.json()
      loadFailures.delete(url)
      return j
    } catch (e) { last = e; if (e instanceof SyntaxError) break }
  }
  loadFailures.add(url)
  throw last
}
