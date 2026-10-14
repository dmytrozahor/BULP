import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { mine, phraseInEpoch, type PhraseDoc } from '../core/phrasemes.ts'
import { phrasesOf } from '../src/lib/datasets.ts'
import { makeRouter } from '../src/router.ts'

// lemma ids: 1 испити, 2 шеломъ, 3 дон (formula); 10 бути, 11 дуже (modern bigram, very frequent)
const names: Record<number, string> = { 1: 'іспити', 2: 'шелом', 3: 'Дон', 10: 'бути', 11: 'дуже' }
const doc = (wid: string, y: [number, number], keys: number[], old = false): PhraseDoc => ({ wid, date: y, old, keys, seg: keys.map(() => 0) })
const sp = (k: number) => names[k] ?? String(k)

describe('BL-12 phraseme candidates', () => {
  const docs = [
    doc('slovo', [1185, 1190], [1, 2, 3, -1, 10], true), doc('zadon', [1390, 1400], [1, 2, 3, -1, 11], true),
    doc('zadon2', [1390, 1400], [1, 2, 3, -1, 10], true),
    ...Array.from({ length: 12 }, (_, i) => doc('mod' + i, [1990, 2010], [10, 11, 10, 11, 10, 11, -1, 11])),
  ]
  const out = mine(docs, k => names[k] ?? String(k), (wi, ti) => sp(docs[wi]!.keys[ti]!))
  it('a formula repeated in 2+ old witnesses outranks a much more frequent modern bigram', () => {
    const f = out.findIndex(p => p.lemmas.join(' ') === 'іспити шелом Дон'), m = out.findIndex(p => p.lemmas.join(' ') === 'бути дуже')
    expect(f).toBeGreaterThanOrEqual(0)
    expect(m === -1 || f < m).toBe(true)
    const mod = out.find(p => p.lemmas.join(' ') === 'бути дуже')
    if (mod) { expect(mod.f).toBeGreaterThan(out[f]!.f); expect(mod.score).toBeLessThan(out[f]!.score) }
  })
  it('records carry method, components and need f ≥ 3 and ≥ 2 witnesses; the maximal gram wins over its sub-grams', () => {
    const p = out[0]!
    expect(p.method).toBe('collocation+archaism'); expect(p.components.pre1400).toBeGreaterThan(0); expect(p.nW).toBeGreaterThanOrEqual(2); expect(p.f).toBeGreaterThanOrEqual(3)
    expect(out.some(q => q.lemmas.join(' ') === 'іспити шелом')).toBe(false)
    expect(phraseInEpoch(p, 1400)).toBe(true)
    expect(mine([doc('a', [1990, 1991], [1, 2, 1, 2, 1, 2])], sp, (_, t) => sp(t))).toEqual([])   // one witness only
  })
  it('card panel lookup and the /phrases route', () => {
    expect(phrasesOf({ candidates: out } as never, 'дон').length).toBeGreaterThan(0)
    expect(makeRouter(true).resolve('/phrases').matched.at(-1)!.name).not.toBe('catch-all')
  })
})

describe.skipIf(!existsSync('public/data/phrases.json'))('BL-12 built phrases.json', () => {
  const d = () => JSON.parse(readFileSync('public/data/phrases.json', 'utf8')) as { method: string; candidates: { method: string; nW: number; f: number }[]; attested: string[] }
  it('every candidate is a model record; attested idioms are a separate list', () => {
    const j = d(); expect(j.method).toBe('collocation+archaism')
    for (const c of j.candidates) { expect(c.method).toBe('collocation+archaism'); expect(c.nW).toBeGreaterThanOrEqual(2); expect(c.f).toBeGreaterThanOrEqual(3) }
    expect(Array.isArray(j.attested)).toBe(true)
  })
})
