/**
 * SPEC 63 DB-2 — the MAIN chip of a lemma: the region of its EARLIEST RELIABLE attestation in our data, and the secondary chips for the other regions, each by its own earliest date.
 * Pure: no node or DOM imports.
 *
 * > owner 2026-11-04: «ідея була в однозначному лінкуванні до найраннішої фіксакції за діалектом в картці, тобто якщо у волині вперше згадується слово то волинь має бути головною плашкою,
 * > усі інші другорядні фіксації. і так само в результатах пошуку вибивати»
 *
 * Reliability (the same gates as the first attestation of a card): a dictionary witness is not an attestation (CR-1); a gated OCR witness (`oq`, SPEC 63 OQ / MM-8 / MM-13) never counts;
 * a witness whose date is uncertain (`dateUncertain`, CQ-2) never counts; a witness with no region cannot give a region and is skipped (counted, so the popover can say so);
 * a place abroad is not a dialect (DB-1c) and is skipped at read time (the row is kept so the popover can say that an earlier fixation was not counted).
 * Honest wording: the region is where the witness was WRITTEN OR PRINTED, as the data knows it. The chip says «перша фіксація: Волинь, 1566», never «волинське слово».
 */
import { isDialectRegion } from './dialect-badge.ts'

/** one row of lm/fr: the earliest reliable witness of a lemma in one region */
export interface FrRow {
  /** region code (pipelines/regions.ts) */ c: string
  /** first year of the witness date, and the last when it is a range */ y: number; y2?: number
  /** witness id (links to /witness/<id>) */ w: string
  /** reliable witnesses of the lemma in this region */ n: number
  /** the region of the witness was derived from a PLACE of publication only (no region named in the metadata) */ p?: 1
}
/** a stored entry: rows by their earliest year, and what was skipped (the counts the popover prints) */
export interface FrEntry {
  r: FrRow[]
  /** witnesses skipped as gated OCR */ o?: number
  /** witnesses skipped for an uncertain date */ x?: number
  /** witnesses skipped for having no region */ u?: number
}
export interface FrWitness { id: string; date: [number, number]; witnessType?: string; region?: string; oq?: unknown; dateUncertain?: unknown }
/** how many regions a stored entry keeps (the earliest ones; abroad rows included so that «not counted» can be said) */
export const FR_MAX_ROWS = 8

/** build the entry of one lemma from `byW` (witness id → tokens of the lemma in it): earliest reliable witness per region */
export function firstRegions(byW: Record<string, number>, wit: (id: string) => FrWitness | undefined, regionOf: (w: FrWitness) => { code: string; place: boolean } | undefined): FrEntry | undefined {
  const by = new Map<string, FrRow>(); let o = 0, x = 0, u = 0
  for (const id of Object.keys(byW)) {
    const w = wit(id); if (!w || w.witnessType === 'dictionary') continue
    if (w.oq) { o++; continue }
    if (w.dateUncertain) { x++; continue }
    const reg = regionOf(w); if (!reg) { u++; continue }
    const cur = by.get(reg.code)
    if (!cur) by.set(reg.code, { c: reg.code, y: w.date[0], ...(w.date[1] !== w.date[0] ? { y2: w.date[1] } : {}), w: w.id, n: 1, ...(reg.place ? { p: 1 as const } : {}) })
    else { cur.n++; if (w.date[0] < cur.y || (w.date[0] === cur.y && w.id < cur.w)) { cur.y = w.date[0]; if (w.date[1] !== w.date[0]) cur.y2 = w.date[1]; else delete cur.y2; cur.w = w.id; if (reg.place) cur.p = 1; else delete cur.p } }
  }
  const r = [...by.values()].sort((a, b) => a.y - b.y || a.c.localeCompare(b.c)).slice(0, FR_MAX_ROWS)
  if (!r.length && !o && !x && !u) return undefined
  return { r, ...(o ? { o } : {}), ...(x ? { x } : {}), ...(u ? { u } : {}) }
}

export interface FirstPick {
  /** the main row(s): one, or several when the first years are equal («одночасно») */ main: FrRow[]
  /** the other real regions by their own earliest year */ secondary: FrRow[]
  /** simultaneous: more than one main row */ simul: boolean
  /** an abroad row earlier than the main year, which was not counted */ skippedAbroad?: FrRow
  /** the main row rests on one witness, or on a place of publication only: shown as a hypothesis */ thin: boolean
}
/** pick the main and the secondary rows of an entry; undefined when no real region has a reliable attestation */
export function pickFirst(e: FrEntry | undefined, name: (code: string) => string = c => c): FirstPick | undefined {
  if (!e) return undefined
  const real = e.r.filter(r => isDialectRegion(r.c, name(r.c)))
  if (!real.length) return undefined
  const y0 = real[0]!.y, main = real.filter(r => r.y === y0), secondary = real.filter(r => r.y !== y0)
  const abroad = e.r.find(r => !isDialectRegion(r.c, name(r.c)) && r.y < y0)
  return { main, secondary, simul: main.length > 1, ...(abroad ? { skippedAbroad: abroad } : {}), thin: main.some(m => m.n === 1 || m.p === 1) }
}
export const yearText = (r: Pick<FrRow, 'y' | 'y2'>): string => (r.y2 && r.y2 !== r.y ? `${r.y}–${r.y2}` : `${r.y}`)
export const witnessHref = (id: string): string => `/witness/${encodeURIComponent(id)}`
