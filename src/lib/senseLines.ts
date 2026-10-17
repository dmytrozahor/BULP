/** SPEC 63 SN-1: the senses of a card's dictionary attestation lines (core/sn.ts), dated from the corpus witnesses / the r2u dictionary editions. */
import { senseOfAtts, type AttSenses } from '../../core/sn.ts'
import { R2U_DICTS } from '../../pipelines/r2u.ts'
import type { CvAtt } from '../../core/cv.ts'
export const r2uByUnit = new Map(R2U_DICTS.map(d => [d.unitId, d]))
export const attSenses = (word: string, atts: CvAtt[], witnessDate: (w: string) => [number, number] | undefined): AttSenses =>
  senseOfAtts(atts, word, w => witnessDate(w) ?? r2uByUnit.get(w)?.years, w => r2uByUnit.get(w)?.dir)
