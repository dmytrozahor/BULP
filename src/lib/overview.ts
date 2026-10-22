/**
 * SPEC 63 OV-11: pure helpers of the «Огляд» tab. The tab only COMPOSES existing blocks in compact form; the choices that need a rule live here so they can be tested:
 * which KWIC lines are the example (earliest dated + one modern or typical, from a non-OCR witness when possible) and the «засвідчено в» line.
 */
import type { Kwic } from '../../core/types.ts'

/** the best 1–2 lines: the earliest dated line and the latest one from another witness (a modern or typical use); lines of OCR witnesses only when nothing else exists */
export function pickExamples<T extends Pick<Kwic, 'w' | 'date'>>(lines: T[], isOcr: (w: string) => boolean = () => false): T[] {
  const dated = (xs: T[]) => xs.filter(k => k.date && k.date[0] > 0).sort((a, b) => a.date[0] - b.date[0] || a.date[1] - b.date[1])
  const clean = lines.filter(k => !isOcr(k.w))
  const pool = dated(clean).length ? dated(clean) : dated(lines).length ? dated(lines) : lines
  if (pool.length <= 1) return pool.slice(0, 1)
  const first = pool[0]!
  const other = [...pool].reverse().find(k => k.w !== first.w) ?? pool[pool.length - 1]!
  return other === first ? [first] : [first, other]
}
/** regions with attestations, most frequent first, named from the corpus table */
export function regionLine(by: { code: string; f: number }[] | undefined, names: { code: string; name: string }[] | undefined, max = 6): { name: string; f: number }[] {
  return (by ?? []).filter(r => r.f > 0).sort((a, b) => b.f - a.f).slice(0, max).map(r => ({ name: names?.find(x => x.code === r.code)?.name ?? r.code, f: r.f }))
}

/** one point of the frequency-over-time curve: f per N of THAT period, in ipm; a period the corpus does not cover (N = 0) is a gap, never a zero */
export interface CurvePoint { c: number; f: number; N: number; ipm: number | null; gap: boolean }
/**
 * Per-period normalisation (research/07 section 3.2, Verlaufskurve): ipm = f / N_c * 10^6 with the N of the same century; centuries from the earliest to the latest century the corpus covers.
 * N = 0 gives a `gap` (no corpus there: the line is broken, nothing is interpolated or smoothed across it); N > 0 and f = 0 is a real zero.
 */
export function curvePoints(series: { c: number; f: number }[], sizes: Record<string, number>): CurvePoint[] {
  const cs = Object.keys(sizes).map(Number).filter(c => sizes[String(c)]! > 0 || series.some(s => s.c === c))
  if (!cs.length) return []
  const lo = Math.min(...cs), hi = Math.max(...cs)
  const f = new Map(series.map(s => [s.c, s.f]))
  const out: CurvePoint[] = []
  for (let c = lo; c <= hi; c++) {
    const N = sizes[String(c)] ?? 0, n = f.get(c) ?? 0
    out.push(N > 0 ? { c, f: n, N, ipm: (n / N) * 1e6, gap: false } : { c, f: n, N, ipm: null, gap: true })
  }
  return out
}
/** runs of consecutive non-gap points: each is one polyline segment */
export function curveSegments(pts: CurvePoint[]): CurvePoint[][] {
  const segs: CurvePoint[][] = []
  for (const p of pts) { if (p.gap) { segs.push([]); continue } if (!segs.length) segs.push([]); segs[segs.length - 1]!.push(p) }
  return segs.filter(s => s.length)
}
