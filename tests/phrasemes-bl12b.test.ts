import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { foldSpelling, mine, phraseFamily, type PhraseDoc } from '../core/phrasemes.ts'

const names: Record<number, string> = { 1: 'господь', 2: 'помогти', 3: 'раб', 4: 'молити', 5: 'бог', 9: 'бути' }
const doc = (wid: string, y: [number, number], keys: number[]): PhraseDoc => ({ wid, date: y, old: true, keys, seg: keys.map(() => 0) })
const sp = (k: number) => names[k] ?? String(k)

describe('BL-12b source families and spelling variants', () => {
  it('Sophia inscriptions are one family, pvl_* redactions one, codex pages one', () => {
    expect(phraseFamily('sophia-112')).toBe('sophia'); expect(phraseFamily('sophia-3425')).toBe('sophia')
    expect(phraseFamily('pvl_lav')).toBe('pvl'); expect(phraseFamily('pvl_hyp')).toBe('pvl'); expect(phraseFamily('i14_10')).toBe(phraseFamily('i14_39'))
    expect(phraseFamily('ostromir')).toBe('ostromir')
  })
  it('«своемоу» and «своему» (оу/ѹ, ѣ/е, jers) fold to one spelling key', () => {
    expect(foldSpelling('своемоу')).toBe(foldSpelling('своему')); expect(foldSpelling('ѹчитель')).toBe(foldSpelling('оучитель'))
    expect(foldSpelling('хлѣбъ')).toBe(foldSpelling('хлеб'))
  })
  const docs = [
    ...Array.from({ length: 30 }, (_, i) => doc('sophia-' + i, [1050, 1100], [1, 2, 3, -1, 9])),
    doc('pvl_lav', [1377, 1377], [4, 5, 3, -1, 9]), doc('kievchr', [1198, 1198], [4, 5, 3, -1, 9]), doc('gvl', [1292, 1292], [4, 5, 3, -1, 9]),
  ]
  const out = mine(docs, k => names[k] ?? String(k), (wi, ti) => sp(docs[wi]!.keys[ti]!))
  it('thirty Sophia inscriptions count as ONE family: nF = 1 and they no longer outrank a formula in three independent chronicles', () => {
    const g = out.find(p => p.lemmas.join(' ') === 'господь помогти раб')!, c = out.find(p => p.lemmas.join(' ') === 'молити бог раб')
    expect(g.nW).toBe(30); expect(g.nF).toBe(1); expect(g.families).toEqual(['sophia'])
    if (c) { expect(c.nF).toBe(3); expect(c.score).toBeGreaterThan(g.score) }
  })
})

describe.skipIf(!existsSync('public/data/phrases.json'))('BL-12b built phrases.json', () => {
  const d = () => JSON.parse(readFileSync('public/data/phrases.json', 'utf8')) as { candidates: { nF: number; attested?: string }[]; formulas: { nF: number; attested?: string }[] }
  it('the top list needs ≥ 2 source families or attested status; single-family repetitions are in the separate formulas list', () => {
    const j = d()
    for (const c of j.candidates) expect(c.nF >= 2 || !!c.attested).toBe(true)
    expect(j.formulas.length).toBeGreaterThan(0); for (const c of j.formulas) { expect(c.nF).toBeLessThan(2); expect(c.attested).toBeUndefined() }
  })
})
