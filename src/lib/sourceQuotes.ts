/**
 * BL-16 «In-site sources»: every verbatim quote we hold for one registry source, with its locator and every place on the site that cites it.
 * Pure: walks arbitrary data (core cards, rule tables) for Evidence-shaped objects (string source + quote + locator). Capped, so a source cited
 * 100 000 times (VESUM) stays a bounded page.
 */
import type { Evidence } from '../../core/evidence.ts'

export interface Place { label: string; to: string }
export interface HeldQuote { ev: Evidence; places: Place[]; nPlaces: number }

const isEv = (o: unknown): o is Evidence => !!o && typeof o === 'object' && typeof (o as Evidence).source === 'string' && typeof (o as Evidence).quote === 'string' && 'locator' in (o as object)

/** collect into `into` (keyed by source|locator|quote so a shared pool object and a copy merge); `place` is the page the data lives on. */
export function collectQuotes(root: unknown, source: string, place: Place, into: Map<string, HeldQuote>, opts: { maxQuotes?: number; maxPlaces?: number } = {}) {
  const maxQ = opts.maxQuotes ?? 200, maxP = opts.maxPlaces ?? 12, seen = new WeakSet<object>()
  const walk = (o: unknown, depth: number) => {
    if (!o || typeof o !== 'object' || depth > 8 || seen.has(o)) return
    seen.add(o)
    if (isEv(o)) {
      if (o.source !== source) return
      const k = `${o.locator}|${o.quote}`; let h = into.get(k)
      if (!h) { if (into.size >= maxQ) return; into.set(k, h = { ev: o, places: [], nPlaces: 0 }) }
      if (!h.places.some(p => p.to === place.to)) { h.nPlaces++; if (h.places.length < maxP) h.places.push(place) }
      return
    }
    for (const v of Array.isArray(o) ? o : Object.values(o)) walk(v, depth + 1)
  }
  walk(root, 0)
}
