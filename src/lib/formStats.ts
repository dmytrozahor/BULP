/**
 * BL-6 form page (/f/:form): statistics of ONE spelling, computed only from what the lemma's detail shard holds (FormCard.f / kwic / epochs, the epoch cells'
 * per-spelling token counts) and the corpus denominators. Pure; tested in tests/formstats.test.ts.
 *  - f, ipm = f / N · 10^6, share of the lemma (f / lemma f);
 *  - HK: the lemma's own class scale (fMax is recovered as lemma.f · 2^lemma.hk, rounding makes it an estimate) applied to the form's f;
 *  - per-epoch f/ipm/N: tokens of that spelling PLACED in the epoch paradigm cells (a lower bound: unplaced tokens are not counted, P-3.1);
 *  - DP is taken over epochs (Gries, core/stats.ts dispersion) on those placed counts — a per-witness DP of one spelling is not stored in the shard, so none is invented.
 */
import { dispersion, dots, freqClass, ipm } from '../../core/stats.ts'
import type { EpochParadigms, FormCard, Kwic } from '../../core/types.ts'

export interface FormEpochStat { epoch: string; f: number; N: number; ipm: number }
export interface FormStats {
  f: number; N: number; ipm: number; hk: number; dots: number; shareOfLemma: number
  byEpoch: FormEpochStat[]; placed: number; dp?: number; evenness?: number; epochRange: number
  witnesses: { w: string; lines: number }[]
}

/** EpochParadigms with every cell reduced to the given spelling (empty cells dropped); N / dropped / stem stay (they describe the lemma). */
export function restrictEpochs(ep: EpochParadigms | undefined, raw: string): EpochParadigms | undefined {
  if (!ep) return undefined
  return { ...ep, paradigms: ep.paradigms.map(p => ({ ...p, cells: p.cells.map(c => ({ key: c.key, forms: c.forms.filter(f => f.raw === raw) })).filter(c => c.forms.length) })) }
}

export function formStats(
  form: Pick<FormCard, 'raw' | 'f' | 'kwic'>, lemma: { f: number; hk: number }, epochs: EpochParadigms | undefined,
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
  const by = new Map<string, number>()
  for (const k of form.kwic as Kwic[]) by.set(k.w, (by.get(k.w) ?? 0) + 1)
  return {
    f, N, ipm: ipm(f, N), hk, dots: dots(hk), shareOfLemma: lemma.f ? f / lemma.f : 0, byEpoch, placed,
    dp: d?.dp, evenness: d?.evenness, epochRange: d?.range ?? 0,
    witnesses: [...by].map(([w, lines]) => ({ w, lines })).sort((a, b) => b.lines - a.lines || a.w.localeCompare(b.w)),
  }
}
