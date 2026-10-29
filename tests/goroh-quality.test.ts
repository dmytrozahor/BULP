/** SPEC 63 GG-9: the Горох quality comparison is reproducible (fixed sample) and its numbers come from the committed measurement. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const md = rd('analysis/goroh-quality.md')
const js = JSON.parse(rd('analysis/goroh-quality.json')) as {
  build: string; seed: number; params: { N_RANDOM: number; N_DIALECT: number; N_HIST: number }
  sample: { w: string; kind: string }[]; count: { coreCards: number; cardindex: Record<string, number>; lm: Record<string, number> }
}

describe('GG-9 Горох quality comparison', () => {
  it('the sample is 50 distinct lemmas: 40 from the frequency list, 5 dialect, 5 historical, seed recorded', () => {
    expect(js.sample).toHaveLength(50)
    expect(new Set(js.sample.map(s => s.w)).size).toBe(50)
    const by = (k: string) => js.sample.filter(s => s.kind === k).length
    expect([by('freq'), by('dialect'), by('hist')]).toEqual([js.params.N_RANDOM, js.params.N_DIALECT, js.params.N_HIST])
    expect(js.seed).toBe(63)
  })
  it('the report names the build, the robots.txt reading and the number of Горох pages opened (≤ 20, ≥ 10 s apart)', () => {
    expect(md).toContain(js.build)
    expect(md).toContain('robots.txt')
    const m = /Відкрито сторінок Гороху:\s*\*\*(\d+)\*\*/.exec(md)
    expect(m, 'page count line').toBeTruthy()
    expect(+m![1]!).toBeLessThanOrEqual(20)
    expect(md).toContain('10,5 с')
  })
  it('every sample lemma appears in the per-lemma table', () => { for (const s of js.sample) expect(md.includes(`| ${s.w} |`), s.w).toBe(true) })
  it('the headline counts in the report are the measured ones', () => {
    const flat = md.replace(/[\s  ]/g, '')
    for (const n of [js.count.coreCards, js.count.cardindex.ld!, js.count.lm.etymology!, js.count.lm.cognates!]) expect(flat.includes(String(n)), String(n)).toBe(true)
  })
  it('unverified cells are marked «?», and the spec carries GG-9 with the proposed follow-ups', () => {
    expect(md).toContain('«?»')
    const spec = rd('specs/63-corpus-dialects.md')
    for (const id of ['GG-9', 'GG-10', 'GG-11', 'GG-12', 'GG-13', 'GG-14', 'GG-15', 'GG-16', 'GG-17']) expect(spec.includes(`**${id}**`), id).toBe(true)
  })
})
