/** SPEC 63 CP-10.4: /f/<кÿнь> resolves through the MM-41 fold candidates (same as search), only when exactly one standard spelling is confirmed. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { zakNote, zakTarget } from '../src/lib/zakRoute.ts'
import { queryKeys } from '../src/lib/search.ts'

const known = (...ks: string[]) => (k: string) => ks.includes(k)
const ready = () => true
describe('CP-10.4 zakTarget', () => {
  it('кÿнь → кінь, вÿс → віз when only that candidate is known (the same candidates search tries)', () => {
    expect(zakTarget('кÿнь', known('кінь'), ready)).toEqual({ state: 'one', to: 'кінь' })
    expect(zakTarget('вÿс', known('віз'), ready)).toEqual({ state: 'one', to: 'віз' })
    expect(queryKeys('кÿнь')).toContain('кінь')
  })
  it('several confirmed candidates, none, a known word, a Latin word, or a plain word: no redirect', () => {
    expect(zakTarget('кÿнь', known('кінь', 'конь'), ready)).toEqual({ state: 'none' })   // і and о both confirmed: ambiguous, the page stays
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
