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
  it('PF-6 maximal() handles 1M synthetic phrasemes in seconds', () => {
    const out: Phraseme[] = []
    for (let i = 0; i < 1_000_000; i++) out.push(mk(['w' + (i % 50000), 'x' + (i % 777), 'y' + (i % 13)].slice(0, 2 + (i % 2)), 3 + (i % 20)))
    const t = Date.now(), r = maximal(out, 1e9)
    expect(r.length).toBeGreaterThan(0)
    expect(Date.now() - t).toBeLessThan(15_000)
  })
  it('PF-6 collectEvidence trie matches the nested prefix targets once per occurrence', () => {
    const p2 = mk(['а', 'б'], 3), p3 = mk(['а', 'б', 'в'], 3)
    const doc = { wid: 'w1', date: [1100, 1200] as [number, number], old: true, keys: [1, 2, 3, 1, 2, 9], seg: [0, 0, 0, 0, 0, 0] }
    const ev = collectEvidence([doc], new Map([[p2, [1, 2]], [p3, [1, 2, 3]]]), (wi, ti) => ({ w: 'w1', loc: String(ti), left: '', node: '', right: '', date: [1100, 1200] }))
    expect(ev.get(p2)!.n).toBe(2)
    expect(ev.get(p3)!.n).toBe(1)
  })
})
