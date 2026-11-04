/**
 * SPEC 63 DB-1b: the rows of the «За регіонами» bars. ipm = f / N of the region's witnesses; a region whose witnesses hold fewer than REGION_MIN_N words has a tiny denominator
 * (one occurrence already makes >= 50 ipm), so its ipm is shown greyed with «мала вибірка: N слів» and is left out of the bar scale (it can never dominate it).
 */
import { fmtNum } from './format.ts'
export interface RegionIn { code: string; f: number; N: number }
export interface BarRow extends RegionIn { name: string; ipm: number; low: boolean; /** bar width, % of the scale of the reliable rows (low-N rows are capped at it) */ w: number; /** the number as printed: it always fits a narrow column */ shown: string }
/** minimum words of a region's witnesses for its ipm to count: below it one occurrence is >= 50 ipm (stated in the block's popover) */
export const REGION_MIN_N = 20_000
export const LOW_N_NOTE = (n: number) => `мала вибірка: ${fmtNum(n)} слів`
export const MIN_N_RULE = `ipm = f / N слів пам’яток регіону. Регіон, у пам’ятках якого менше ${fmtNum(REGION_MIN_N)} слів, має малу вибірку: одне вживання вже дає ≥ 50 ipm, тому його число показано сірим і воно не задає шкалу стовпчиків.`
/** large values lose the decimals (67 190,4 -> 67 190), small ones keep one */
export const shownIpm = (v: number): string => fmtNum(v, v >= 1000 ? 0 : 1)
export function barRows(by: RegionIn[] | undefined, nameOf: (code: string) => string, limit = 6): BarRow[] {
  const rows = (by ?? []).filter(r => r.N > 0 && r.f > 0).map(r => ({ ...r, name: nameOf(r.code), ipm: (r.f / r.N) * 1e6, low: r.N < REGION_MIN_N }))
  const max = Math.max(1e-9, ...rows.filter(r => !r.low).map(r => r.ipm), ...(rows.some(r => !r.low) ? [] : rows.map(r => r.ipm)))
  return rows.sort((a, b) => +a.low - +b.low || b.ipm - a.ipm).slice(0, limit).map(r => ({ ...r, w: Math.min(100, (r.ipm / max) * 100), shown: shownIpm(r.ipm) }))
}
