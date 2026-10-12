import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { modernize, MODERN_RULES, type HasForm } from '../core/modernize.ts'

/** VESUM mocked */
const LEX = new Set(['буряк', "бур'ян", 'свято', 'цвях', 'ґудзик', "здоров'я", 'життя', 'знання', "комп'ютер", 'його', 'льон', 'козацький', 'курйоз', "від'їзд", "м'ясо", 'поле'])
const has: HasForm = f => LEX.has(f)
const none: HasForm = () => false
const forms = (w: string, h = has) => modernize(w, h).map(m => m.form)

describe('MO-1 modernize(): rule table', () => {
  it('every rule has a § cite with a Q quote (P-1.3)', () => {
    for (const r of MODERN_RULES) { expect(r.cite.kind, r.id).toBe('Q'); expect(r.section, r.id).toMatch(/§/); expect(r.cite.quote.length).toBeGreaterThan(20) }
  })
  it("бурян → бур'ян (§ 7 п.2, confirmed by the lexicon)", () => {
    const m = modernize('бурян', has)
    expect(m[0]!.form).toBe("бур'ян"); expect(m[0]!.status).toBe('vesum')
    expect(m[0]!.steps.map(s => s.rule)).toEqual(['MO-APOS-R'])
    expect(m[0]!.steps[0]!.section).toBe('§ 7 п.2')
    expect(m[0]!.claim.evidence.length).toBeGreaterThanOrEqual(2)   // rule cite + data (P-1.4)
    expect(m[0]!.claim.method).toBeTruthy()
  })
  it("without a lexicon answer the apostrophe is only a hint (буряк / бур'ян are spelled alike)", () => {
    expect(modernize('бурян', none)[0]).toMatchObject({ form: "бур'ян", status: 'hint' })
  })
  it('буряк stays (attested; § 7 п.2 Примітка)', () => { expect(modernize('буряк', has)).toEqual([]) })
  it('свято and цвях stay: no apostrophe after a root consonant (§ 7 п.1 Примітка), even with an empty lexicon', () => {
    expect(modernize('свято', has)).toEqual([])
    expect(forms('свято', none)).toEqual([]); expect(forms('цвях', none)).toEqual([])
  })
  it("мясо → м'ясо, здоровя → здоров'я (labial word-initial or after a vowel)", () => {
    expect(forms('мясо')).toContain("м'ясо"); expect(forms('здоровя')).toContain("здоров'я")
  })
  it("prefix case: відїзд → від'їзд (§ 7 п.4)", () => { expect(modernize('відїзд', has)[0]).toMatchObject({ form: "від'їзд", status: 'vesum' }) })
  it("loanword: компютер → комп'ютер only when the lexicon has it (§ 138)", () => {
    expect(forms('компютер')).toContain("комп'ютер"); expect(forms('компютер', none)).toEqual([])
  })
  it('г → ґ only when the lexicon has the ґ-form (§ 6)', () => {
    expect(modernize('гудзик', has)[0]).toMatchObject({ form: 'ґудзик', status: 'vesum' }); expect(forms('гудзик', none)).toEqual([])
  })
  it('ьо at the start of a word → йо (structural, § 8)', () => {
    expect(modernize('ього', none)[0]).toMatchObject({ form: 'його', status: 'rule' })
  })
  it('курйоз stays (§ 138 п.2); лйон → льон only via the lexicon', () => {
    expect(modernize('курйоз', has)).toEqual([]); expect(forms('курйоз', none)).toEqual([])
    expect(forms('лйон')).toContain('льон'); expect(forms('лйон', none)).toEqual([])
  })
  it('-ськ- → -цьк- (§ 19): козакський → козацький', () => { expect(modernize('козакський', has)[0]).toMatchObject({ form: 'козацький', status: 'vesum' }) })
  it('gemination (§ 30): житє → життя, знаньє → знання; a bare -е is not touched', () => {
    expect(modernize('житє', has)[0]).toMatchObject({ form: 'життя', status: 'vesum' }); expect(forms('знаньє')).toContain('знання')
    expect(forms('поле', none)).toEqual([])
  })
  it('Лук’ян keeps its capital and apostrophe (§ 7 п.3)', () => { expect(forms('Лукян', none)).toContain("Лук'ян") })
})

describe('MO-2 wiring', () => {
  it('MO-2 modernize runs as the last step in /derive (old → modern) and in /analyze', () => {
    for (const f of ['src/views/DeriveView.vue', 'src/views/AnalyzeView.vue']) { const s = readFileSync(f, 'utf8'); expect(s, f).toContain('modernize('); expect(s, f).toContain('ModernForms') }
    expect(readFileSync('src/components/ModernForms.vue', 'utf8')).toContain('сучасний правопис:')
  })
})

describe('MO-2 never overrides an attested form', () => {
  it('has(word) → no suggestions at all', () => { for (const w of LEX) expect(modernize(w, has), w).toEqual([]) })
  it('order: vesum → rule → hint', () => {
    const order = ['vesum', 'rule', 'hint'], r = modernize('бурян', f => f === "бур'ян").map(x => x.status)
    expect(r).toEqual([...r].sort((a, b) => order.indexOf(a) - order.indexOf(b)))
  })
})
