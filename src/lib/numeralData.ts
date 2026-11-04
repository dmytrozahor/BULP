/** SPEC 63 DV-1b: lazy loader of public/data/dv/numerals.json (the numeral map); fetched only by a numeral card and by the page «Числівники за говорами», never in the first load. */
import { shallowRef } from 'vue'
import { fetchJson } from './fetchJson.ts'
import type { NumeralMap, NumRow } from '../../core/numeral-map.ts'
import { CARD_LEMMAS, ORD_LEMMAS } from '../../core/numeral-lists.ts'

const map = shallowRef<NumeralMap | null | undefined>(undefined)
let started = false
export const isNumeralLemma = (w: string): boolean => CARD_LEMMAS.includes(w) || ORD_LEMMAS.includes(w)
export function loadNumerals(): void {
  if (started) return
  started = true
  fetchJson('./data/dv/numerals.json').then(j => { map.value = j as NumeralMap | null }, () => { map.value = null })
}
/** the map (undefined while loading, null when absent) */
export const numeralMap = (): NumeralMap | null | undefined => { loadNumerals(); return map.value }
export const numeralRow = (lemma: string): NumRow | undefined => (isNumeralLemma(lemma) ? numeralMap()?.rows.find(r => r.lemma === lemma) : undefined)
