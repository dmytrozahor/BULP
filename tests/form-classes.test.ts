/** BL-14: the 11 form classes research/27 §3.4 listed as missed by the derivation. */
import { describe, it, expect } from 'vitest'
import { derive, RULES } from '../core/phonology.ts'
import { explain } from '../core/reverse.ts'
import { originsForward, originsFor } from '../core/origin.ts'
import { toIpa } from '../core/ipa.ts'
import { key } from '../core/text.ts'

const forms = (old: string) => derive(old).candidates.map(c => key(c.form))
const has = (old: string, modern: string) => forms(old).includes(modern)
const trace = (old: string, modern: string) => derive(old).candidates.find(c => key(c.form) === modern)?.trace ?? []

describe('BL-14 form classes (research/27 §3.4)', () => {
  it('BL-14 class 1: -овъ > -ів (Львовъ → Львів; gen. pl. братовъ → братів, ковалевъ → ковалів)', () => {
    for (const [o, m] of [['львовъ', 'львів'], ['братовъ', 'братів'], ['ковалевъ', 'ковалів']] as const) expect(has(o, m), o).toBe(true)
    expect(trace('львовъ', 'львів')).toContain('R10')
  })
  it('BL-14 class 2: the alternation is only in the closed syllable: стола keeps о, and the dialect у (V2) is only for стіл', () => {
    expect(has('столъ', 'стіл')).toBe(true); expect(forms('стола')).toEqual(['стола'])
    const std = toIpa('стола', [2], 'ZAK', originsFor('стола', { paradigm: ['стіл', 'стола'] }).origins).ipa
    expect(std).toBe(toIpa('стола', [2]).ipa); expect(toIpa('стіл', [2], 'ZAK', originsFor('стіл', { paradigm: ['стола'] }).origins).ipa).toBe('[ˈstul]')
  })
  it('BL-14 class 3: -івл- by analogy (будовля → будівля, торговля → торгівля), a lexical branch tagged R10a, not R10', () => {
    for (const [o, m] of [['будовля', 'будівля'], ['торговля', 'торгівля'], ['зимовля', 'зимівля']] as const) { expect(has(o, m), o).toBe(true); expect(trace(o, m)).toEqual(['R10a']) }
    expect(has('будовля', 'будовля')).toBe(true)   // the non-analogical branch survives
  })
  it('BL-14 class 4: pleophonic і is lexically allowed (сторонъ → сторін, берегъ → беріг), the ordinary candidate stays', () => {
    expect(has('сторонъ', 'сторін')).toBe(true); expect(has('берегъ', 'беріг')).toBe(true)
    expect(has('сторонъ', 'сторон')).toBe(true); expect(forms('городъ')).toEqual(['город']); expect(trace('сторонъ', 'сторін')).toContain('R10b')
  })
  it('BL-14 class 5: open-syllable і in кінець-type words (R10c); the plain candidate stays', () => {
    expect(has('коньць', 'кінець')).toBe(true); expect(trace('коньць', 'кінець')).toContain('R10c'); expect(has('коньць', 'конець')).toBe(true)
  })
  it('BL-14 class 6: prothesis is shown before the ikavism (окъно → вокно → вікно)', () => {
    const t = trace('окъно', 'вікно'); expect(t).toEqual(expect.arrayContaining(['R04', 'R21', 'R10'])); expect(t.indexOf('R21')).toBeLessThan(t.indexOf('R10'))
    const st = explain('окъно', 'вікно')!.steps.map(s => `${s.rule}:${s.to}`); expect(st).toContain('R21:вокно')
  })
  it('BL-14 class 7: the trace records which jer followed (ніс < несъ: ъ; ь for the soft jer), and несла has no і', () => {
    expect(originsForward('несъ').find(c => c.form === 'ніс')!.origins[1]).toMatchObject({ rule: 'R10', jer: 'ъ' })
    expect(originsForward('пень').find(c => c.form === 'пінь')?.origins[1]).toMatchObject({ jer: 'ь' })
    expect(forms('несла')).toEqual(['несла'])
  })
  it('BL-14 class 8: е > о after sibilants runs after R10 (шесть → шість, четыри → чотири, жена → жона)', () => {
    expect(has('шесть', 'шість')).toBe(true); expect(has('четыри', 'чотири')).toBe(true); expect(has('жена', 'жона')).toBe(true)
    expect(RULES.findIndex(r => r.id === 'R10')).toBeLessThan(RULES.findIndex(r => r.id === 'R17'))
  })
  it('BL-14 class 9: new ѣ (ѣ₂) is marked for the lexemes WP «Новий ять» names (камѣнь, шѣсть), not for an etymological ѣ (дѣтина, лѣсъ)', () => {
    expect(originsForward('камѣнь').find(c => c.form === 'камінь')!.origins[3]!.kind).toBe('new')
    expect(originsForward('шѣсть').find(c => c.form === 'шість')!.origins[1]!.kind).toBe('new')
    expect(originsForward('дѣтина').find(c => c.form === 'дітина')!.origins[1]!.kind).toBeUndefined()
  })
  it('BL-14 class 10: written ô / ê (Galician etymological orthography) read as the ikavism marker (Львôвъ → Львів, мôй → мій, кôнь → кінь)', () => {
    for (const [o, m] of [['Львôвъ', 'львів'], ['мôй', 'мій'], ['кôнь', 'кінь'], ['стêлъ', 'стіл']] as const) expect(has(o, m), o).toBe(true)
    expect(has('Льво̂въ', 'львів')).toBe(true)   // combining circumflex
  })
  it('BL-14 class 11: prothetic и- before л/р + jer (илвовъ → Львів, ильняний → льняний, ръжа → іржа)', () => {
    expect(has('илвовъ', 'львів')).toBe(true); expect(has('ильняний', 'льняний')).toBe(true); expect(has('ръжа', 'іржа')).toBe(true)
    expect(trace('илвовъ', 'львів')).toContain('R21c')
  })
})
