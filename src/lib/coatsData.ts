/**
 * SPEC 63 DB-1: lazy index of the coats of arms (public/coats/index.json: the usable rows of data/coats/SOURCES.json, ~3 KB). Fetched AFTER the first paint (idle), only by the badge and the map;
 * a missing index just means «no arms»: every marker then falls back to the plain colour marker. The SVG files themselves are fetched one by one, by the <img>/<image> that shows them.
 */
import { shallowRef } from 'vue'
import { coatUrl, coatUsable, type CoatSources } from '../../core/coats.ts'
export const coatIndex = shallowRef<CoatSources | null | undefined>(undefined)   // undefined = not asked yet, null = absent
let asked: Promise<void> | undefined
export function loadCoatIndex(): Promise<void> {
  return (asked ??= fetch('./coats/index.json').then(r => (r.ok ? r.json() : null)).then(j => { coatIndex.value = (j as CoatSources | null) ?? null }, () => { coatIndex.value = null }))
}
/** run `fn` once the browser is idle after the first paint */
export function afterPaint(fn: () => void) {
  const w = globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }
  if (typeof window === 'undefined') return
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 2000 }); else setTimeout(fn, 300)
}
/** URL of the arms of a coat id, or undefined when the index is not loaded / has no usable row */
export const armsSrc = (id: string | undefined): string | undefined => (coatUsable(id, coatIndex.value ?? undefined) ? coatUrl(id!) : undefined)
