/**
 * BUILD stage, statistics (SPEC 20 B-4, SPEC 10 M-5). Thin glue over core/stats.ts — every number is stored with its
 * denominator in corpus.json (epochSizes, centurySizes, N) per P-1.6.
 *
 * > B-4: "f, ipm over admitted N; HK vs the most frequent lemma; dots; DP over witnesses; byEpoch (shev scheme, plus wl scheme),
 * >  byCentury with smooth(window=1); shifts = compare() for each pair of adjacent shev epochs with data;
 * >  colloc: lemma window ±3 within segment s, f_xy ≥ 3, logDice > 0, top 12."
 */
import { EPOCHS } from '../core/epochs.ts'
import { compare, dispersion, dots, freqClass, ipm, logDice, smooth } from '../core/stats.ts'
import type { LemmaStats } from '../core/types.ts'

export interface Sizes {
  N: number
  epoch: Record<string, number>
  century: Record<string, number>
  witnesses: { id: string; n: number }[]
}
export interface Counts { f: number; perW: Map<string, number>; perEpoch: Map<string, number>; perCentury: Map<number, number> }

const SHEV = EPOCHS.filter(e => e.scheme === 'shev').map(e => e.id)
const r3 = (x: number) => Math.round(x * 1000) / 1000

/** Centuries with data span min..max; gaps have N=0 → ipm 0 and smooth null. */
export function lemmaStats(c: Counts, fMax: number, sz: Sizes, colloc: LemmaStats['colloc']): LemmaStats {
  const hk = freqClass(c.f, fMax)
  const dp = dispersion(sz.witnesses.map(w => ({ y: c.perW.get(w.id) ?? 0, n: w.n })))
  const byEpoch: LemmaStats['byEpoch'] = {}
  for (const [id, f] of c.perEpoch) byEpoch[id] = { f, ipm: r3(ipm(f, sz.epoch[id] ?? 0)) }
  const cents = Object.keys(sz.century).map(Number).sort((a, b) => a - b)
  const range = cents.length ? Array.from({ length: cents[cents.length - 1]! - cents[0]! + 1 }, (_, i) => cents[0]! + i) : []
  const raw = range.map(k => { const n = sz.century[String(k)] ?? 0; return n ? ipm(c.perCentury.get(k) ?? 0, n) : null })
  const sm = smooth(raw, 1)
  const byCentury = range.map((k, i) => ({ c: k, f: c.perCentury.get(k) ?? 0, ipm: r3(raw[i] ?? 0), smooth: sm[i] == null ? null : r3(sm[i]!) }))
  const withData = SHEV.filter(id => (sz.epoch[id] ?? 0) > 0)
  const shifts: LemmaStats['shifts'] = []
  for (let i = 0; i + 1 < withData.length; i++) {
    const a = withData[i]!, b = withData[i + 1]!, fa = c.perEpoch.get(a) ?? 0, fb = c.perEpoch.get(b) ?? 0
    if (!fa && !fb) continue
    const r = compare(fa, fb, sz.epoch[a]!, sz.epoch[b]!)
    shifts.push({ a, b, g2: r3(r.g2), logRatio: r3(r.logRatio), p: r.p })
  }
  return { f: c.f, ipm: r3(ipm(c.f, sz.N)), hk, dots: dots(hk), dp: r3(dp.dp), range: dp.range, byEpoch, byCentury, shifts, colloc }
}

/** Window ±3 inside a segment; counts y in the window of every x (both kept). Returns top-12 per x by logDice (f_xy ≥ 3, logDice > 0). */
export function collocations(docs: { id: Int32Array; seg: Int32Array }[], fx: ArrayLike<number>, keep: Uint8Array, names: string[], win = 3, minF = 3, top = 12): Map<number, LemmaStats['colloc']> {
  const pair = new Map<number, number>(), M = 1 << 21
  for (const { id, seg } of docs) {
    for (let i = 0; i < id.length; i++) {
      const x = id[i]!; if (x < 0 || !keep[x]) continue
      for (let j = Math.max(0, i - win); j <= Math.min(id.length - 1, i + win); j++) {
        if (j === i || seg[j] !== seg[i]) continue
        const y = id[j]!; if (y < 0 || y === x || !keep[y]) continue
        const k = x * M + y; pair.set(k, (pair.get(k) ?? 0) + 1)
      }
    }
  }
  const out = new Map<number, LemmaStats['colloc']>()
  for (const [k, fxy] of pair) {
    if (fxy < minF) continue
    const x = Math.floor(k / M), y = k % M, ld = logDice(fxy, fx[x]!, fx[y]!)
    if (ld <= 0) continue
    const a = out.get(x) ?? []; a.push({ lemma: names[y]!, fxy, logDice: r3(ld) }); out.set(x, a)
  }
  for (const [x, a] of out) out.set(x, a.sort((p, q) => q.logDice - p.logDice || q.fxy - p.fxy).slice(0, top))
  return out
}
