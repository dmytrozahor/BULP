/** SPEC 63 CP-10.4: /f/<кÿнь> resolves through the MM-41 fold candidates (same as search), only when exactly one standard spelling is confirmed. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { zakNote, zakTarget } from '../src/lib/zakRoute.ts'
import { queryKeys } from '../src/lib/search.ts'

/** key → lemmas map: a key mapping to [] / missing is unknown */
const known = (...ks: string[]) => (k: string) => (ks.includes(k) ? [k] : [])
const L = (m: Record<string, string[]>) => (k: string) => m[k] ?? []
const ready = () => true
describe('CP-10.4 zakTarget', () => {
  it('кÿнь → кінь, вÿс → віз when only that candidate is known (the same candidates search tries)', () => {
    expect(zakTarget('кÿнь', known('кінь'), ready)).toEqual({ state: 'one', to: 'кінь' })
    expect(zakTarget('вÿс', known('віз'), ready)).toEqual({ state: 'one', to: 'віз' })
    expect(queryKeys('кÿнь')).toContain('кінь')
  })
  it('live data: кÿнь → кінь and конь (a form of кінь) are one lemma; вÿс → віз wins as the і-reading although вез and воз are also known', () => {
    expect(zakTarget('кÿнь', L({ кінь: ['кінь'], конь: ['кінь'] }), ready)).toEqual({ state: 'one', to: 'кінь' })
    expect(zakTarget('вÿс', L({ віз: ['віз'], вез: ['ВЕЗ'], воз: ['віз', 'воз'] }), ready)).toEqual({ state: 'one', to: 'віз' })
    expect(zakTarget('вÿс', L({ віз: ['віз'], віс: ['ВІС'], вез: ['ВЕЗ'] }), ready)).toEqual({ state: 'one', to: 'віз' })   // live: віс is a token lemma, the voiced і-spelling decides
    expect(zakTarget('вÿс', L({ віс: ['віс', 'віс2'], вез: ['ВЕЗ'] }), ready)).toEqual({ state: 'none' })   // the first confirmed і-reading is itself ambiguous
  })
  it('several confirmed candidates, none, a known word, a Latin word, or a plain word: no redirect', () => {
    expect(zakTarget('кÿнь', L({ кінь: ['кінь'], кень: ['кеня'], конь: ['конь'] }), ready)).toEqual({ state: 'one', to: 'кінь' })   // і-reading decides
    expect(zakTarget('кÿнь', L({ кень: ['кеня'], конь: ['конь'] }), ready)).toEqual({ state: 'none' })   // і-tier unconfirmed, two other lemmas: ambiguous, the page stays
    expect(zakTarget('кÿнь', known(), ready)).toEqual({ state: 'none' })
    expect(zakTarget('кÿнь', known('кÿнь', 'кінь'), ready)).toEqual({ state: 'none' })
    expect(zakTarget('für', known('fir'), ready)).toEqual({ state: 'none' }); expect(zakTarget('кінь', known('кінь'), ready)).toEqual({ state: 'none' })
  })
  it('a candidate whose shard is still loading is «loading», not «unknown»', () => {
    expect(zakTarget('кÿнь', known(), k => k !== 'кінь')).toEqual({ state: 'loading' })
  })
  it('the note names the spelling, the standard form and the source; a made-up ?zak= shows nothing', () => {
    const n = zakNote('кÿнь', 'кінь'); expect(n?.text).toBe('написання кÿнь зведено до кінь (закарпатське ÿ, ЕУМ um162)'); expect(n?.cite).toContain('um162')
    expect(zakNote('хôжу', 'хожу')?.text).toBe('написання хôжу зведено до хожу (закарпатське ô, ЕУМ um162)')
    expect(zakNote('кÿнь', 'вода')).toBeUndefined(); expect(zakNote('кінь', 'кінь')).toBeUndefined(); expect(zakNote(undefined, 'кінь')).toBeUndefined()
  })
  it('wired: FormView redirects with ?zak=, WordView / LightWordView / FormView print the note', () => {
    expect(readFileSync('src/views/FormView.vue', 'utf8')).toMatch(/zakTarget\(props\.form[\s\S]*router\.replace\(.*zak=/)
    for (const v of ['WordView', 'LightWordView', 'FormView']) expect(readFileSync(`src/views/${v}.vue`, 'utf8'), v).toContain('<ZakNote')
  })
})
