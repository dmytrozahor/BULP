/** Lazy, cached loader for public/data/places.json (NP-2) and the lemma → place lookup used by the word card (NP-3). */
import type { PlaceOut, PlacesFile } from '../../core/places.ts'
import { placeOf } from '../../core/places.ts'

let p: Promise<PlacesFile> | undefined
export function loadPlaces(): Promise<PlacesFile> {
  p ??= fetch('./data/places.json').then(r => { if (!r.ok) throw new Error(`places.json: HTTP ${r.status}`); return r.json() as Promise<PlacesFile> }).catch(e => { p = undefined; throw e })
  return p
}

/** The gazetteer row of a word-card lemma: the same lemma name, else the lemma's capitalised form falls into the place's stem. */
export function placeForLemma(places: PlaceOut[], lemma: string): PlaceOut | undefined {
  const exact = places.find(x => x.lemma === lemma)
  if (exact) return exact
  const cap = lemma.charAt(0).toUpperCase() + lemma.slice(1), q = placeOf(cap)
  return q && /^[А-ЯІЇЄҐ]/.test(lemma) ? places.find(x => x.id === q.id) : undefined
}

export const osmLink = (lat: number, lon: number, z = 8) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${z}/${lat}/${lon}`
