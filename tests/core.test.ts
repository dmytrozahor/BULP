import { describe, it, expect } from 'vitest'
import { claim, unknown, EvidenceError, Q, D, noisyOr } from '../core/evidence.ts'
import { derive, havlik, RULES } from '../core/phonology.ts'
import { assignEpoch } from '../core/epochs.ts'
import { freqClass, logDice, compare, dispersion, dots, smooth } from '../core/stats.ts'
import { key, stripStress, renderStress, stressPositions, normalizeOld, decodeVira, decodeIzbornyk } from '../core/text.ts'
import { detect, type Ctx } from '../core/detect.ts'
import { fold } from '../core/orthography.ts'
import { CS_RULES, CONTACT_RULES, DIALECT_RULES, REGISTER_RULES } from '../core/rules.ts'

describe('P-1.1/P-1.2 evidence invariant', () => {
  it('rejects a claim without evidence', () => expect(() => claim('x', [])).toThrow(EvidenceError))
  it('rejects malformed evidence', () => expect(() => claim('x', { source: 'S', quote: '', locator: 'l', kind: 'Q' })).toThrow(EvidenceError))
  it('unknown needs no evidence', () => expect(unknown().value).toBe('unknown'))
  it('accepts a cited claim', () => expect(claim('x', Q('SHEV', '62', 'q')).evidence).toHaveLength(1))
  it('noisy-OR', () => expect(noisyOr([0.5, 0.5])).toBeCloseTo(0.75))
})

describe('P-1.3 every rule has a citation', () => {
  it('sound rules', () => RULES.forEach(r => expect(r.cite.quote.length, r.id).toBeGreaterThan(5)))
  it('detector rules', () => [...CS_RULES, ...CONTACT_RULES, ...DIALECT_RULES, ...REGISTER_RULES].forEach(r => expect(r.cite.source, r.id).toBeTruthy()))
})

describe('M-3.1 worked derivations (research/03 §2.1)', () => {
  const has = (raw: string, want: string) => {
    const d = derive(raw)
    expect(d.candidates.map(c => c.form), raw).toContain(want)
    return d.candidates.find(c => c.form === want)!
  }
  it('видѣти → видіти via R09', () => expect(has('видѣти', 'видіти').trace).toEqual(['R09']))
  it('конь → кінь via R04, R10', () => expect(has('конь', 'кінь').trace).toEqual(['R04', 'R10']))
  it('кыѥвъ → київ', () => expect(has('кыѥвъ', 'київ').trace).toEqual(['R03', 'R04', 'R12']))
  it('ходилъ → ходив', () => has('ходилъ', 'ходив'))
  it('городъ → город (pleophony blocks R10)', () => expect(derive('городъ').candidates.map(c => c.form)).toEqual(['город']))
  it('сънъ → сон, дьнь → день, отьць → отець', () => { has('сънъ', 'сон'); has('дьнь', 'день'); has('отьць', 'отець') })
  it('кънѧзь → князь', () => has('кънѧзь', 'князь'))
  it('столъ → стіл, печь → піч, вълкъ → вовк', () => { has('столъ', 'стіл'); has('печь', 'піч'); has('вълкъ', 'вовк') })
  it('житьѥ → життя, мѧсо → м\'ясо', () => { has('житьѥ', 'життя'); has('мѧсо', "м'ясо") })
  it('titlo: бг҃ъ → бог', () => has('бг҃ъ', 'бог'))
  it('havlik marks weak/strong jers', () => expect(havlik('сънъ')).toBe('сн·'))
})

describe('text', () => {
  it('strips only stress, keeps й and ї', () => expect(stripStress('її́ й')).toBe('її й'))
  it('stress round-trip', () => { const s = renderStress('помилка', [1, 3]); expect(stressPositions(s)).toEqual({ form: 'помилка', positions: [1, 3] }) })
  it('key', () => expect(key('По́ми́лка’')).toBe("помилка'"))
  it('N03/N04', () => expect(normalizeOld('ѡтроковицѹ').norm).toBe('отроковицу'))
  it('decoders', () => { expect(decodeVira('свэтъ')).toBe('свѣтъ'); expect(decodeIzbornyk('Києв&#1123;')).toBe('Києвѣ') })
})

describe('orthography folds (SPEC 20 B-2.4)', () => {
  const forms = (w: string, o: string) => fold(w, o).map(c => c.form)
  it('ярижка винъ → він, троянцивъ → троянців (research/01, Енеида 1798)', () => { expect(forms('винъ', 'ярижка')).toContain('він'); expect(forms('троянцивъ', 'ярижка')).toContain('троянців') })
  it('кулішівка украінськоі → української (і after a vowel = ї)', () => expect(forms('украінськоі', 'кулішівка')).toContain('української'))
  it('no orthography → identity', () => expect(forms('хата', '')).toEqual(['хата']))
})

describe('epochs (research/09 §4 examples)', () => {
  it('Peresopnytsia 1556–1561', () => { expect(assignEpoch([1556, 1561], 'shev').value).toMatchObject({ epochs: ['shev.early_middle'], confidence: 'high' }); expect(assignEpoch([1556, 1561], 'wl').value).toMatchObject({ epochs: ['wl.ruthenian'] }) })
  it('Eneida 1798 disagrees by design', () => { expect(assignEpoch([1798, 1798], 'shev').value).toMatchObject({ epochs: ['shev.late_middle'] }); expect(assignEpoch([1798, 1798], 'wl').value).toMatchObject({ epochs: ['wl.new'] }) })
  it('spanning range → low confidence list', () => expect(assignEpoch([1300, 1600], 'shev').value).toMatchObject({ confidence: 'low' }))
})

describe('M-5 statistics (research/07 §2)', () => {
  it('HK rounds: 76 of 3 789 654 → 16', () => expect(freqClass(76, 3789654)).toBe(16))
  it('logDice max 14', () => expect(logDice(10, 10, 10)).toBe(14))
  it('G² is symmetric and zero for equal rates', () => { expect(compare(10, 10, 1000, 1000).g2).toBeCloseTo(0); expect(compare(30, 5, 1e4, 1e4).g2).toBeCloseTo(compare(5, 30, 1e4, 1e4).g2) })
  it('DP: even = 0', () => expect(dispersion([{ y: 1, n: 10 }, { y: 1, n: 10 }]).dp).toBe(0))
  it('dots in 0..6', () => { expect(dots(0)).toBe(6); expect(dots(30)).toBe(0) })
  it('smoothing keeps nulls out', () => expect(smooth([1, null, 3], 1)).toEqual([1, 2, 3]))
})

describe('detectors', () => {
  const lex: Record<string, { lemma: string; tags: string }[]> = { город: [{ lemma: 'город', tags: 'noun:inanim:m:v_naz' }], свіча: [{ lemma: 'свіча', tags: 'noun:inanim:f:v_naz' }], шо: [{ lemma: 'шо', tags: 'conj:subord:slang' }] }
  const ctx = (form: string, extra: Partial<Ctx> = {}): Ctx => ({ form, vesum: lex[form] ?? [], inLexicon: f => lex[f] ?? [], derive: f => derive(f).candidates.map(c => c.form), ...extra })
  it('CS-C1 градъ ↔ город (VESUM-confirmed doublet)', () => expect(detect(CS_RULES, ctx('градъ', { norm: 'градъ', year: 1113 })).claims.church_slavonic?.evidence.length).toBe(2))
  it('CS-C1 does not fire on брат', () => expect(detect(CS_RULES, ctx('брат', { norm: 'братъ', year: 1113 })).claims.church_slavonic).toBeUndefined())
  it('CS-C3 свѣща ↔ свіча', () => expect(detect(CS_RULES, ctx('свѣща', { norm: 'свѣща', year: 1113 })).claims.church_slavonic).toBeDefined())
  it('register: шо is colloquial via VESUM :slang', () => expect(detect(REGISTER_RULES, ctx('шо')).claims.colloquial?.evidence[1]?.kind).toBe('D'))
  it('ы in a 1798 text is archaic orthography, not a russianism', () => {
    const d = detect(CONTACT_RULES, ctx('мы', { year: 1798, norm: 'мы' }))
    expect(d.claims.archaic_orthography).toBeDefined(); expect(d.claims.russianism_orth).toBeUndefined()
  })
  it('-тся in modern input is a russianism; -ться is not', () => {
    expect(detect(CONTACT_RULES, ctx('смієтся')).claims.russianism_orth).toBeDefined()
    expect(detect(CONTACT_RULES, ctx('сміється')).claims.russianism_orth).toBeUndefined()
  })
  it('dialect diphthong fires only on non-normative forms', () => expect(detect(DIALECT_RULES, ctx('вуол')).claims.CHN).toBeDefined())
  it('unsourced rules only hint (P-3.1)', () => { const d = detect(REGISTER_RULES, ctx('тре')); expect(d.claims.colloquial).toBeUndefined(); expect(d.hints[0]?.rule).toBe('REG-H-TRE') })
  it('rule claims carry rule cite + trigger (P-1.4)', () => { const c = detect(REGISTER_RULES, ctx('шо')).claims.colloquial!; expect(c.evidence.map(e => e.kind)).toEqual(['Q', 'D']) })
  it('unused import guard', () => expect(D('a', 'b', 'c').kind).toBe('D'))
})
