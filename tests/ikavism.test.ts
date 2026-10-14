/** BL-14: staged chain of the new ikavism, dialect reflexes, «Львув» only as a reconstructed stage. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { chainsForStep, chainsForWord, dialectReflexes, DIALECT_REFLEXES, isAttestedSpelling } from '../core/ikavism.ts'
import { explain, reverse } from '../core/reverse.ts'

const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

describe('BL-14 staged chain in the derivation trace', () => {
  it('BL-14 chain: конь → кінь, R10 step = south о > о· > у· > ü > і and north о > о· > уо > уі > і, reconstruction with the Shevelov quote', () => {
    const r10 = explain('конь', 'кінь')!.steps.find(s => s.rule === 'R10')!
    const cs = chainsForStep(r10), south = cs.find(c => c.branch === 'south')!, north = cs.find(c => c.branch === 'north')!
    expect(south.stages.map(s => s.form)).toEqual(['конь', 'ко·нь', 'кунь', 'кüнь', 'кінь'])
    expect(north.stages.map(s => s.form)).toEqual(['конь', 'ко·нь', 'куонь', 'куінь', 'кінь'])
    expect(south.status).toBe('reconstruction'); expect(south.stages.every(s => s.attested === false)).toBe(true)
    expect(south.quote).toMatchObject({ kind: 'Q', source: 'SHEV' }); expect(south.quote.quote).toContain('stu·l > stül > stil')
    expect(south.dates.quote).toContain('XVI ст.')
  })
  it('BL-14 chain: е > е· > і and ѣ > е· > і (R09), south and north', () => {
    const e = chainsForStep({ rule: 'R10', from: 'печь', to: 'пічь' })
    expect(e.find(c => c.branch === 'south')!.stages.map(s => s.form)).toEqual(['печь', 'пе·чь', 'пічь'])
    expect(e.find(c => c.branch === 'north')!.stages.map(s => s.form)).toEqual(['печь', 'пе·чь', 'піечь', 'пічь'])
    const y = chainsForStep(explain('лѣсъ', 'ліс')!.steps.find(s => s.rule === 'R09')!)
    expect(y.find(c => c.branch === 'south')!.stages.map(s => s.form)).toEqual(['лѣс', 'ле·с', 'ліс'])
    expect(y.find(c => c.branch === 'north')!.stages.at(1)!.form).toBe('ліес')
  })
  it('BL-14 chain: a reconstruction (backward) R10 step gets the same chain; other rules get none', () => {
    const c = reverse('кінь', { paradigm: ['коня'] }).candidates[0]!, st = c.trace.find(t => t.rule === 'R10')!
    expect(chainsForStep(st).length).toBe(2); expect(chainsForStep({ rule: 'R04', from: 'кон', to: 'кін' })).toEqual([])
  })
  it('BL-14 chain: the derivation trace and both word views show it', () => {
    expect(src('../src/components/DerivationSteps.vue')).toContain('chainsForStep')
    expect(src('../src/components/WordCard.vue')).toContain('<IkavismChain'); expect(src('../src/views/WordView.vue')).toContain('<IkavismChain')
    expect(src('../src/components/IkavismChain.vue')).toMatch(/реконструкція/)
  })
})

describe('BL-14 Львув is a reconstructed intermediate, never attested', () => {
  it('BL-14 Львів: chain from the paradigm (Львова) has the stage Львув marked не засвідчено; no attested list contains it', () => {
    const cs = chainsForWord('Львів', { paradigm: ['Львова'] }), south = cs.find(c => c.branch === 'south')!
    expect(south.stages.map(s => s.form)).toContain('Львув'); expect(south.stages.find(s => s.form === 'Львув')!.attested).toBe(false)
    expect(DIALECT_REFLEXES.some(x => x.form.toLowerCase() === 'львув')).toBe(false); expect(isAttestedSpelling('Львув')).toBe(false)
    expect(dialectReflexes('Львів').map(x => x.form)).toEqual(expect.arrayContaining(['Илвов', 'Львôвъ']))
  })
})

describe('BL-14 attested dialect reflexes', () => {
  it('BL-14 reflexes: кінь кун’ (WPL), віз вус/вÿс (ZAK), віз вуз (HUT), стіл стêл (MPL), піч піеч (CHN)', () => {
    expect(dialectReflexes('кінь').map(x => x.form)).toEqual(expect.arrayContaining(['кун’', 'кин’']))
    expect(dialectReflexes('віз').filter(x => x.regions.includes('ZAK')).map(x => x.form)).toEqual(['вус', 'вÿс'])
    expect(dialectReflexes('віз').map(x => x.form)).toContain('вуз'); expect(dialectReflexes('стіл').map(x => x.form)).toContain('стêл'); expect(dialectReflexes('піч')[0]!.regions).toEqual(['CHN'])
  })
  it('BL-14 reflexes: every reflex is a Q whose verbatim quote prints the form', () => {
    for (const x of DIALECT_REFLEXES) { expect(x.evidence.kind, x.form).toBe('Q'); expect(x.evidence.quote, x.form).toContain(x.form) }
  })
})
