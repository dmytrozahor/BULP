/** SPEC 63 LA-1…LA-3 — loanword adaptation rules. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { SOURCES } from '../core/sources.ts'
import { LOAN_RULES, ROUTE_UK, analyzeLoan } from '../core/loan-adapt.ts'

const rd = (p: string) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

describe('LA-1 research', () => {
  it('every rule has a registered source, a locator, a quote and a row in research/34', () => {
    const r = rd('research/34-loan-adaptation.md')
    expect(LOAN_RULES.length).toBeGreaterThanOrEqual(9)
    for (const rule of LOAN_RULES) {
      expect(r, rule.id).toContain(rule.id)
      expect(rule.ev.length).toBeGreaterThan(0)
      for (const e of rule.ev) { expect(SOURCES[e.source], e.source).toBeTruthy(); expect(e.locator).toMatch(/^https?:/); expect(e.quote.length).toBeGreaterThan(10) }
    }
  })
  it('the Правопис quotes are verbatim paragraphs of §§ 33, 129, 133, 134', () => {
    const q = (id: string) => LOAN_RULES.find(r => r.id === id)!.ev.find(e => e.source === 'PRAV')!
    expect(q('LA-ejbil').quote).toContain('імітуючи їхнє звучання в мові оригіналу')
    expect(q('LA-ejbil').locator).toContain('prav_par=133')
    expect(q('LA-abil').locator).toContain('prav_par=134')
    expect(q('LA-iti').locator).toContain('prav_par=129')
    expect(q('LA-ichn').locator).toContain('prav_par=33')
  })
})

describe('LA-2 engine', () => {
  it('екстремітет: -ітет ← -ity, Latin/German route', () => {
    const a = analyzeLoan('екстремітет')!
    expect(a.steps.map(s => s.id)).toEqual(['LA-itet']); expect(a.stem).toBe('екстрем'); expect(a.source).toBe('екстрем… + -ity'); expect(a.route).toBe('latin')
  })
  it('екстреміті: -іті ← -ity, direct English', () => {
    const a = analyzeLoan('екстреміті')!
    expect(a.steps.map(s => s.id)).toEqual(['LA-iti']); expect(a.route).toBe('direct-en'); expect(a.source).toBe('екстрем… + -ity')
  })
  it('аплікейбіліті: phonetic (ей = [eɪ], § 133) + -іті', () => {
    const a = analyzeLoan('аплікейбіліті')!
    expect(a.steps.map(s => s.id)).toEqual(['LA-iti', 'LA-ejbil']); expect(a.route).toBe('phonetic'); expect(a.stem).toBe('аплік'); expect(a.source).toBe('аплік… + -abil-ity')
  })
  it('аплікабіліті: graphic (a → а, лат. -abil-) + -іті', () => {
    const a = analyzeLoan('аплікабіліті')!
    expect(a.steps.map(s => s.id)).toEqual(['LA-iti', 'LA-abil']); expect(a.route).toBe('graphic'); expect(a.source).toBe('аплік… + -abil-ity')
  })
  it('всм is an abbreviation, not a loan adaptation: no rule fires', () => { expect(analyzeLoan('всм')).toBeNull() })
  it('the other suffix rules fire: ація, ізм, ичн-, -абельність, -абельн-', () => {
    expect(analyzeLoan('індустріалізація')!.steps[0]!.id).toBe('LA-acija')
    expect(analyzeLoan('реалізм')!.steps[0]!.id).toBe('LA-izm')
    expect(analyzeLoan('математичний')!.steps[0]!.id).toBe('LA-ichn')
    expect(analyzeLoan('аплікабельність')!.steps[0]!.id).toBe('LA-abelnist')
    expect(analyzeLoan('аплікабельний')!.steps[0]!.id).toBe('LA-abeln')
    expect(analyzeLoan('університет')!.route).toBe('latin'); expect(analyzeLoan('вода')).toBeNull()
  })
  it('normative status: VESUM present / absent / unchecked; Правопис § only where a rule cites it', () => {
    expect(analyzeLoan('екстремітет')!.status.vesum).toBe('unchecked')
    expect(analyzeLoan('екстремітет', { vesum: () => null })!.status.vesum).toBe('absent')
    expect(analyzeLoan('університет', { vesum: () => 'університет noun:inanim:m:v_naz' })!.status).toMatchObject({ vesum: 'present', pravopys: [] })
    expect(analyzeLoan('екстреміті')!.status.pravopys.map(p => p.rule)).toEqual(['LA-iti'])
  })
  it('a standard equivalent appears only when a dictionary row gives it', () => {
    expect(analyzeLoan('аплікабельність')!.equivalent).toBeUndefined()
    const eq = analyzeLoan('аплікабельність', { equivalents: [{ w: 'аплікабельність', eq: 'застосовність', source: 'WIKT', loc: 'https://uk.wiktionary.org', quote: 'застосовність — fixture' }] })!.equivalent!
    expect(eq.value).toBe('застосовність'); expect(eq.evidence[0]!.source).toBe('WIKT')
  })
})

describe('LA-3 UI', () => {
  it('WordView and FormView mount the «запозичення» block; /method lists every rule with an anchor', () => {
    for (const v of ['WordView', 'FormView']) expect(rd(`src/views/${v}.vue`)).toContain('<LoanAdaptBlock')
    const b = rd('src/components/LoanAdaptBlock.vue'), m = rd('src/views/MethodView.vue')
    expect(b).toContain('запозичення'); expect(b).toContain('ClaimBadge'); expect(b).toContain("hash: '#la-'")
    expect(m).toContain('`la-${r.id}`')
    expect(Object.keys(ROUTE_UK)).toHaveLength(4)
  })
})
