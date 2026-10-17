/** perf: dispersionFast is bit-identical to the object-allocating dispersion() over all witnesses. */
import { describe, it, expect } from 'vitest'
import { dispersionFast, type Sizes } from '../pipelines/build-stats.ts'
import { dispersion } from '../core/stats.ts'

let seed = 7
const rnd = (n: number) => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) % n) }

describe('perf: sparse dispersion', () => {
  it('bit-identical on random witness sets, repeated calls (buffer reset), unknown ids ignored, empty cases', () => {
    const witnesses = Array.from({ length: 500 }, (_, i) => ({ id: 'w' + i, n: 1 + rnd(100000) }))
    const sz = { N: 0, epoch: {}, century: {}, witnesses } as Sizes
    for (let k = 0; k < 300; k++) {
      const perW = new Map<string, number>()
      for (let j = rnd(40); j > 0; j--) perW.set('w' + rnd(500), 1 + rnd(5000))
      if (k % 7 === 0) perW.set('noFreq-witness', 9)
      const ref = dispersion(witnesses.map(w => ({ y: perW.get(w.id) ?? 0, n: w.n })))
      expect(dispersionFast(perW, sz)).toStrictEqual(ref)
    }
    expect(dispersionFast(new Map(), sz)).toStrictEqual(dispersion(witnesses.map(w => ({ y: 0, n: w.n }))))
    const dup = { ...sz, witnesses: [{ id: 'a', n: 3 }, { id: 'a', n: 5 }] } as Sizes   // duplicate ids → falls back to the reference path
    expect(dispersionFast(new Map([['a', 2]]), dup)).toStrictEqual(dispersion([{ y: 2, n: 3 }, { y: 2, n: 5 }]))
  })
})
