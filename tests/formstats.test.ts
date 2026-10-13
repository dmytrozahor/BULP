import { describe, expect, it } from 'vitest'
import { formRegions, formStats, restrictEpochs } from '../src/lib/formStats.ts'
import type { EpochParadigms } from '../core/types.ts'

const cf = (raw: string, n: number) => ({ raw, n, src: 'torot' as const, t: 0, ex: [0, '1'] as [number, string] })
const ep = { tags: [''], stem: {} as any, paradigms: [
  { epoch: 'shev.old', grid: 'noun', N: 9, dropped: { conflict: 0, underspecified: 0, untagged: 0 }, cells: [{ key: 'sg.nom', forms: [cf('а', 3), cf('б', 1)] }, { key: 'pl.nom', forms: [cf('а', 1)] }] },
  { epoch: 'shev.mid', grid: 'noun', N: 5, dropped: { conflict: 0, underspecified: 0, untagged: 0 }, cells: [{ key: 'sg.gen', forms: [cf('б', 2)] }] },
] } as EpochParadigms
const sizes = { N: 1_000_000, epoch: { 'shev.old': 400_000, 'shev.mid': 600_000 } }
const kw = (w: string) => ({ w, loc: '1', left: '', node: 'а', right: '', date: [1100, 1100] as [number, number] })

describe('BL-6 form statistics', () => {
  const s = formStats({ raw: 'а', f: 4, kwic: [kw('x'), kw('y'), kw('x')] }, { f: 8, hk: 2 }, ep, sizes)
  it('f, ipm, share of lemma, HK on the lemma scale (fMax = f·2^hk)', () => {
    expect(s.f).toBe(4); expect(s.ipm).toBeCloseTo(4); expect(s.shareOfLemma).toBe(0.5)
    expect(s.hk).toBe(3)   // fMax = 32, log2(32/4) = 3
  })
  it('per-epoch counts are the placed cell tokens of that spelling, with denominators', () => {
    expect(s.byEpoch).toEqual([{ epoch: 'shev.old', f: 4, N: 400_000, ipm: 10 }])
    expect(s.placed).toBe(4)
  })
  it('DP over epochs: all tokens in one of two epochs is uneven; witnesses counted from KWIC', () => {
    expect(s.dp).toBeCloseTo(0.5 * (Math.abs(1 - 0.4) + 0.6), 6); expect(s.epochRange).toBe(1)
    expect(s.witnesses).toEqual([{ w: 'x', lines: 2 }, { w: 'y', lines: 1 }])
  })
  it('no placed tokens → no DP invented; zero f is safe', () => {
    const z = formStats({ raw: 'в', f: 0, kwic: [] }, { f: 8, hk: 2 }, ep, sizes)
    expect(z.dp).toBeUndefined(); expect(z.hk).toBe(0); expect(z.byEpoch).toEqual([])
  })
  it('restrictEpochs keeps only that spelling and drops emptied cells', () => {
    const r = restrictEpochs(ep, 'б')!
    expect(r.paradigms[0]!.cells).toEqual([{ key: 'sg.nom', forms: [cf('б', 1)] }]); expect(r.paradigms[1]!.cells).toHaveLength(1)
    expect(restrictEpochs(undefined, 'б')).toBeUndefined()
  })
})

describe('BL-6b form regions', () => {
  const regions = [{ code: 'kyiv', name: 'K', oblasts: [], N: 100 }, { code: 'volyn', name: 'V', oblasts: [], N: 50 }, { code: 'halychyna', name: 'H', oblasts: [], N: 0 }]
  const reg: Record<string, string> = { a: 'Київ', b: 'Волинь', c: 'Київ', d: 'Київ або Новгород' }
  it('counts kwic lines by witness region, keeps region N, drops unknown/unmatched witnesses and empty regions', () => {
    const r = formRegions([{ w: 'a' }, { w: 'c' }, { w: 'd' }, { w: 'z' }, { w: 'b' }], regions, w => reg[w])
    expect(r).toEqual([{ code: 'kyiv', f: 2, N: 100 }, { code: 'volyn', f: 1, N: 50 }])
    expect(formRegions([], undefined, () => undefined)).toEqual([])
  })
})
