import type { TPoint } from './graphLayout.ts'
import { witnessTo } from './nav.ts'
import { RU_LABEL, ruOfWitness, type WitnessLike } from '../../core/ru-source.ts'

/** SPEC 63 MM-4: a card with attestations from at least this many witnesses shows the chronology graph (same panel as the full cards) */
export const WIT_GRAPH_MIN = 2
export const witKind = (t: string): string => /chron|літопис/i.test(t) ? 'chronicle' : /folk|song|фольк/i.test(t) ? 'folk' : 'other'
export interface WitLike extends Partial<WitnessLike> { title: string; date: [number, number]; witnessType: string }
const ruPoint = (id: string, x: WitLike): { ru?: string } => { const f = ruOfWitness({ ...x, id }); return f ? { ru: RU_LABEL[f.kind] } : {} }
/** one plate per known witness (x = composition year, f = tokens or examples); unknown ids are dropped */
export const witnessPoints = (items: { w: string; n: number }[], get: (id: string) => WitLike | undefined): TPoint[] => items.flatMap(({ w, n }) => {
  const x = get(w)
  return x ? [{ id: w, label: x.title.slice(0, 18), year: (x.date[0] + x.date[1]) / 2, f: n, kind: witKind(x.witnessType), to: witnessTo(w), title: x.title, ...ruPoint(w, x) }] : []
})
export const showWitnessGraph = (points: TPoint[]): boolean => new Set(points.map(p => p.id)).size >= WIT_GRAPH_MIN