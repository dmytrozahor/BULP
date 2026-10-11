import { describe, it, expect } from 'vitest'
import { detect, type Ctx } from '../core/detect.ts'
import { CONTACT_RULES, DIALECT_RULES, RUSYN_RULES, RUSYN_SHARED, RUSYN_STATUS, detectRusyn, rusynClaim } from '../core/rules.ts'
import { claim } from '../core/evidence.ts'

const ctx = (form: string, o: Partial<Ctx> = {}): Ctx => ({ form, vesum: [], inLexicon: () => [], ...o })
const contact = (f: string, o: Partial<Ctx> = {}) => detect(CONTACT_RULES, ctx(f, o)).claims
const rusyn = (f: string, o: Partial<Ctx> = {}) => rusynClaim(detectRusyn(ctx(f, o)).claims)

describe('RU-3 ы gate (research/10 §5)', () => {
  it('быть → russianism_orth (-ть with ы is positive Russian evidence)', () => { expect(contact('быть').russianism_orth).toBeDefined(); expect(rusyn('быть')).toBeUndefined() })
  it('быти → rusyn, no russianism_orth', () => { expect(contact('быти').russianism_orth).toBeUndefined(); expect(rusyn('быти')?.value).toBe('rusyn') })
  it('гынути → rusyn and dialect ZAK', () => {
    expect(rusyn('гынути')?.value).toBe('rusyn')
    expect(detect(DIALECT_RULES, ctx('гынути')).claims.ZAK).toBeDefined()
    expect(contact('гынути').russianism_orth).toBeUndefined()
  })
  it('синьый → rusyn (ьы)', () => expect(rusyn('синьый')?.value).toBe('rusyn'))
  it('ambiguous ы (мы, сын, рыба, был) → ambiguous_y, not russianism_orth, not rusyn', () => {
    for (const f of ['мы', 'ты', 'вы', 'сын', 'рыба', 'был']) { expect(contact(f).ambiguous_y, f).toBeDefined(); expect(contact(f).ambiguous_y!.score).toBeCloseTo(0.2); expect(contact(f).russianism_orth, f).toBeUndefined(); expect(rusyn(f), f).toBeUndefined() }
  })
  it('э stays a russianism signal; ё with ы is vetoed by RUE-PRESOV-YO', () => {
    expect(contact('этот').russianism_orth).toBeDefined()
    expect(contact('ёлка').russianism_orth).toBeDefined()
    expect(contact('сёлы').russianism_orth).toBeUndefined(); expect(rusyn('сёлы')?.value).toBe('rusyn:presov')
  })
})

describe('RU-2 gate and shared rows', () => {
  it('no 1919 gate, but ≥ 1850; normative forms never fire', () => {
    expect(rusyn('ногы', { year: 1905 })).toBeDefined()
    expect(rusyn('ногы', { year: 1113 })).toBeUndefined()
    expect(rusyn('ногы', { vesum: [{ lemma: 'нога', tags: 'noun:inanim:f:v_naz' }] })).toBeUndefined()
  })
  it('shared rows add evidence only when a RUE-/PAN- row fired', () => {
    const solo = detectRusyn(ctx('синови')); expect(Object.keys(solo.claims)).toEqual([])
    const both = detectRusyn(ctx('кынови')); expect(both.claims.rusyn?.method).toMatch(/RUE-Y-VELAR.*SW-DAT-OVY/)
    expect(RUSYN_SHARED.every(r => r.axis === 'rusyn' && r.label === 'rusyn')).toBe(true)
  })
  it('specific variant label wins over the undetermined rusyn', () => {
    const c = rusynClaim({ rusyn: claim(true as const, RUSYN_STATUS.evidence, { score: 0.9 }), 'rusyn:lemko': claim(true as const, RUSYN_STATUS.evidence, { score: 0.3 }) })
    expect(c?.value).toBe('rusyn:lemko')
  })
})

describe('RU-4 evidence', () => {
  it('every Rusyn rule cites its source (P-1.3) and renderer quotes are paraphrases (P)', () => {
    for (const r of RUSYN_RULES) { expect(r.cite.source, r.id).toBeTruthy(); expect(r.cite.quote.length, r.id).toBeGreaterThan(5); expect(r.cite.locator, r.id).toBeTruthy() }
    for (const r of RUSYN_RULES.filter(r => ['UPRS'].includes(r.cite.source))) expect(r.cite.kind, r.id).toBe('P')
    expect(RUSYN_STATUS.evidence.find(e => e.source === 'ISO')!.kind).toBe('P')
  })
  it('rusyn claim carries rule cite + trigger', () => expect(rusyn('русинськый')!.evidence.map(e => e.kind)).toContain('D'))
  it('status note is neutral and cites both positions', () => { expect(RUSYN_STATUS.evidence.length).toBeGreaterThanOrEqual(4); expect(RUSYN_STATUS.note).toMatch(/не є висновком про статус/) })
})
