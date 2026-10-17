/** perf: memoised buildArchaic / indexed ArchScan.hit return exactly what the pre-perf code (tests/fixtures/ref/*.old.ts) returns. */
import { describe, it, expect } from 'vitest'
import { derive } from '../core/phonology.ts'
import { buildArchaic } from '../pipelines/build-archaic.ts'
import { buildArchaic as oldBuild } from './fixtures/ref/build-archaic.old.ts'

let seed = 99
const rnd = (n: number) => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) % n) }
const pick = <T>(xs: T[]) => xs[rnd(xs.length)]!

describe('perf: archaic build', () => {
  it('random dictionary + text witnesses (both orths, oldI, repeated types, mixed case) give an identical file, refs and counts', () => {
    const heads = ['надобноє', 'менувати', 'подстароста', 'кастелян', 'небытность', 'дом', 'ходити', 'польськой']
    const words = [...heads, 'Менувати', 'НАДОБНОЕ', 'надобное', 'подстароста', 'подстаросте', 'кастеляна', 'небытности', 'дім', 'ход', 'х', 'abc', 'новый', 'новый', 'новый']
    const dict = (id: string) => ({ id, title: 'D', witnessType: 'dictionary' as const, lang: 'ruthenian' as const, date: [1450, 1459] as [number, number], tokens: heads.flatMap((h, i) => [{ raw: h, loc: `т.2 ряд. ${i}: «${h.toUpperCase()} с. (2) x`, s: 1 }, ...(i % 3 ? [{ raw: h.replace('о', 'а'), loc: `т.2 ряд. ${i}: «${h.toUpperCase()} с. (2) x`, s: 1 }] : [])]) })
    const text = (id: string, orth: string | undefined, oldI: boolean, y: number) => ({ id, title: 'T', witnessType: 'scholarly_ed' as const, lang: 'ruthenian' as const, ...(orth ? { orth } : {}), oldI, date: [y, y] as [number, number], tokens: Array.from({ length: 120 }, (_, i) => ({ raw: pick(words), loc: `абз. ${i}`, s: i >> 3 })) })
    const mk = () => {
      seed = 99
      return [{ w: dict('d1'), linked: (ti: number) => ti % 5 === 4, epoch: 'shev.early_middle' }, { w: dict('d2'), linked: () => false },
        ...[['modernised', false], ['ізборник-нормалізований', true], [undefined, false], [undefined, true], ['modernised', true]].map(([o, oi], k) => ({ w: text('t' + k, o as string | undefined, oi as boolean, 1500 + k * 30), linked: (ti: number) => ti % 11 === 0, epoch: k % 2 ? 'shev.middle' : undefined }))]
    }
    const d = (s: string, oldI: boolean) => derive(s, { oldI })
    const a = oldBuild(mk(), d, 'x'), b = buildArchaic(mk(), d, 'x')
    expect(JSON.stringify(b.file)).toBe(JSON.stringify(a.file))
    expect(JSON.stringify([...b.refs])).toBe(JSON.stringify([...a.refs]))
    expect(b.counts).toEqual(a.counts)
    expect(a.counts.dictionaryTokens).toBeGreaterThan(5)
    expect(a.counts.unverifiedTokens).toBeGreaterThan(0)
  })
})
