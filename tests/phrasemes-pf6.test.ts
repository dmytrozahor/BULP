import { describe, expect, it } from 'vitest'
import { maximal, PHRASE_METHOD, type Phraseme } from '../core/phrasemes.ts'
import { collectEvidence } from '../core/phraseme-pages.ts'

const mk = (lemmas: string[], f: number): Phraseme => ({ lemmas, spellings: [], f, witnesses: [], nW: 0, families: [], nF: 0, dates: [0, 0], score: 0, components: {} as never, method: PHRASE_METHOD })
/** the pre-PF-6 filter, verbatim */
function maximalOld(out: Phraseme[], top: number): Phraseme[] {
  const byF = new Map<number, Phraseme[]>()
  for (const p of out) { const a = byF.get(p.f) ?? []; a.push(p); byF.set(p.f, a) }
  const res: Phraseme[] = []
  for (const p of out) {
    const j = ' ' + p.lemmas.join(' ') + ' '
    if (byF.get(p.f)?.some(q => q.lemmas.length > p.lemmas.length && (' ' + q.lemmas.join(' ') + ' ').includes(j))) continue
    res.push(p); if (res.length >= top) break
  }
  return res
}
let seed = 12345
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n }

describe('PF-6 maximality filter', () => {
  it('PF-6 maximal() equals the old quadratic filter on random fixtures (multi-word lemmas, equal-f buckets)', () => {
    const alphabet = ['а', 'б', 'в', 'аб', 'а б', 'б в', 'в а б', 'ба', 'г']
    for (let round = 0; round < 300; round++) {
      const out = Array.from({ length: 5 + rnd(60) }, () => mk(Array.from({ length: 2 + rnd(4) }, () => alphabet[rnd(alphabet.length)]!), 3 + rnd(3)))
      const top = 1 + rnd(40)
      expect(maximal(out, top)).toEqual(maximalOld(out, top))
    }
  })
  it('PF-6 maximal() drops a sub-gram only when the longer gram has the same f', () => {
    const a = mk(['а', 'б'], 3), b = mk(['а', 'б', 'в'], 3), c = mk(['б', 'в'], 4)
    expect(maximal([a, b, c], 10)).toEqual([b, c])
  })
  it('PF-6 maximal() scales linearly (4x the input costs ~4x, not ~16x) and survives 1M synthetic phrasemes', () => {
    const gen = (n: number) => { const out: Phraseme[] = []; for (let i = 0; i < n; i++) out.push(mk(['w' + (i % 50000), 'x' + (i % 777), 'y' + (i % 13)].slice(0, 2 + (i % 2)), 3 + (i % 20))); return out }
    const time = (out: Phraseme[]) => { const t = performance.now(), r = maximal(out, 1e9); return { ms: performance.now() - t, n: r.length } }
    // machine independent: the same run's smaller input is the baseline, so only the growth rate is asserted, never seconds
    const small = gen(100_000), mid = gen(400_000)
    time(small)   // warm-up (JIT)
    const s1 = Math.min(time(small).ms, time(small).ms), m = { ms: Math.min(time(mid).ms, time(mid).ms) }   // best of two: a GC pause or a loaded box inflates one run, not both
    expect(m.ms / Math.max(s1, 1), `400k took ${Math.round(m.ms)} ms, 100k ${Math.round(s1)} ms`).toBeLessThan(11)   // linear ~4 (+GC/cache noise); quadratic ~16
    expect(time(gen(1_000_000)).n).toBeGreaterThan(0)   // completes at full size (a quadratic filter never would)
  }, 300_000)
  it('PF-6 collectEvidence trie matches the nested prefix targets once per occurrence', () => {
    const p2 = mk(['а', 'б'], 3), p3 = mk(['а', 'б', 'в'], 3)
    const doc = { wid: 'w1', date: [1100, 1200] as [number, number], old: true, keys: [1, 2, 3, 1, 2, 9], seg: [0, 0, 0, 0, 0, 0] }
    const ev = collectEvidence([doc], new Map([[p2, [1, 2]], [p3, [1, 2, 3]]]), (wi, ti) => ({ w: 'w1', loc: String(ti), left: '', node: '', right: '', date: [1100, 1200] }))
    expect(ev.get(p2)!.n).toBe(2)
    expect(ev.get(p3)!.n).toBe(1)
  })
})
