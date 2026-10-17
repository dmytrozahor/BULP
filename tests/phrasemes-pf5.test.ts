import { describe, expect, it } from 'vitest'
import { mine, spanOf, type PhraseDoc } from '../core/phrasemes.ts'

describe('PF-5 no spread over huge arrays', () => {
  it('PF-5 mine() keeps 250k content-word phrasemes without a call-stack overflow', () => {
    const V = 250_001, keys = Int32Array.from({ length: V }, (_, i) => i), seg = new Int32Array(V)
    const docs: PhraseDoc[] = ['a1', 'b1', 'c1'].map((wid, i) => ({ wid, date: [1100 + i, 1200 + i], old: true, keys, seg, fam: 'fam' + i }))
    const out = mine(docs, k => 'слово' + k, (_wi, ti) => 'слово' + ti, { maxN: 2, minF: 3, top: 1e9 })
    expect(out.length).toBeGreaterThan(200_000)
    expect(out[0]!.dates).toEqual([1100, 1202])
  })
  it('PF-5 spanOf is min start / max end of any number of ranges', () => {
    const ds: [number, number][] = Array.from({ length: 500_000 }, (_, i) => [1000 + (i % 977), 1100 + (i % 983)])
    expect(spanOf(ds)).toEqual([1000, 1100 + 982])
  })
})
