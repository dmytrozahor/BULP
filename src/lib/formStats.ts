/**
 * BL-6 form page (/f/:form): statistics of ONE spelling, computed only from what the lemma's detail shard holds (FormCard.f / kwic / epochs, the epoch cells'
 * per-spelling token counts) and the corpus denominators. Pure; tested in tests/formstats.test.ts.
 *  - f, ipm = f / N · 10^6, share of the lemma (f / lemma f);
 *  - HK: the lemma's own class scale (fMax is recovered as lemma.f · 2^lemma.hk, rounding makes it an estimate) applied to the form's f;
 *  - per-epoch f/ipm/N: tokens of that spelling PLACED in the epoch paradigm cells (a lower bound: unplaced tokens are not counted, P-3.1);
 *  - DP is taken over epochs (Gries, core/stats.ts dispersion) on those placed counts — a per-witness DP of one spelling is not stored in the shard, so none is invented.
 */
import { dispersion, dots, freqClass, ipm } from '../../core/stats.ts'
import { regionOf } from '../../pipelines/regions.ts'
import type { CorpusMeta, EpochParadigms, FormCard, Kwic, LemmaStats } from '../../core/types.ts'

export interface FormEpochStat { epoch: string; f: number; N: number; ipm: number }
export interface FormStats {
  f: number; N: number; ipm: number; hk: number; dots: number; shareOfLemma: number
  byEpoch: FormEpochStat[]; placed: number; dp?: number; evenness?: number; epochRange: number
  /** `witnesses[].lines` = true tokens of this spelling (BL-6c); false = KWIC lines only (data built before BL-6c: a lower bound) */
  trueCounts: boolean
  witnesses: { w: string; lines: number }[]
}

/** EpochParadigms with every cell reduced to the given spelling (empty cells dropped); N / dropped / stem stay (they describe the lemma). */
export function restrictEpochs(ep: EpochParadigms | undefined, raw: string): EpochParadigms | undefined {
  if (!ep) return undefined
  return { ...ep, paradigms: ep.paradigms.map(p => ({ ...p, cells: p.cells.map(c => ({ key: c.key, forms: c.forms.filter(f => f.raw === raw) })).filter(c => c.forms.length) })) }
}

export function formStats(
  form: Pick<FormCard, 'raw' | 'f' | 'kwic' | 'byW'>, lemma: { f: number; hk: number }, epochs: EpochParadigms | undefined,
  sizes: { N: number; epoch: Record<string, number> },
): FormStats {
  const f = form.f, N = sizes.N
  const fMax = lemma.f * 2 ** lemma.hk, hk = f > 0 && fMax > 0 ? Math.max(0, freqClass(f, fMax)) : 0
  const byEpoch: FormEpochStat[] = []
  for (const p of epochs?.paradigms ?? []) {
    const n = p.cells.reduce((s, c) => s + c.forms.filter(x => x.raw === form.raw).reduce((a, x) => a + x.n, 0), 0)
    if (n > 0) { const En = sizes.epoch[p.epoch] ?? 0; byEpoch.push({ epoch: p.epoch, f: n, N: En, ipm: ipm(n, En) }) }
  }
  const placed = byEpoch.reduce((s, e) => s + e.f, 0)
  const parts = Object.entries(sizes.epoch).filter(([, n]) => n > 0).map(([e, n]) => ({ y: byEpoch.find(b => b.epoch === e)?.f ?? 0, n }))
  const d = placed ? dispersion(parts) : undefined
  const by = new Map<string, number>(form.byW ? Object.entries(form.byW) : [])   // BL-6c: true per-witness counts when the shard has them, else the KWIC lines (lower bound)
  if (!form.byW) for (const k of form.kwic as Kwic[]) by.set(k.w, (by.get(k.w) ?? 0) + 1)
  return {
    trueCounts: !!form.byW,
    f, N, ipm: ipm(f, N), hk, dots: dots(hk), shareOfLemma: lemma.f ? f / lemma.f : 0, byEpoch, placed,
    dp: d?.dp, evenness: d?.evenness, epochRange: d?.range ?? 0,
    witnesses: [...by].map(([w, lines]) => ({ w, lines })).sort((a, b) => b.lines - a.lines || a.w.localeCompare(b.w)),
  }
}

/**
 * BL-6b: this spelling's tokens by REGION OF THE WITNESS («регіон пам’ятки», SPEC 20 B-3.6 — never a dialect label). The shard keeps only ≤ 6 KWIC lines per
 * spelling, so f per region counts those lines (a lower bound); N = the region's token count from corpus.regions (denominator, P-1.6). A witness whose region
 * is unknown or matches no region row is left out (unknown stays unknown, P-3.1). Rows are shaped like LemmaStats.byRegion, so RegionMap / regionRows apply.
 */
export function formRegions(
  src: Pick<Kwic, 'w'>[] | Record<string, number>, regions: CorpusMeta['regions'] | undefined, witnessRegion: (w: string) => string | undefined,
): NonNullable<LemmaStats['byRegion']> {
  const f = new Map<string, number>()
  // BL-6c: `src` = FormCard.byW (true tokens per witness) or, for older data, the KWIC lines (one per line, a lower bound)
  for (const [w, n] of Array.isArray(src) ? src.map(k => [k.w, 1] as const) : Object.entries(src)) { const c = regionOf(witnessRegion(w)); if (c) f.set(c, (f.get(c) ?? 0) + n) }
  return (regions ?? []).filter(r => r.N > 0).map(r => ({ code: r.code, f: f.get(r.code) ?? 0, N: r.N }))
}
